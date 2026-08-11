import os
import time
import yaml
import threading
from datetime import datetime
from typing import Dict, Any, Optional
from models.job import JobState, Job
from engines.aria2_engine import Aria2Engine
from engines.ytdlp_engine import YTDLPEngine
from firebase import (
    get_firestore_client,
    get_job_action_ref,
    delete_job_action,
    update_job_rtdb_fields,
    update_device_presence_fields,
)
from agent.job_bridge import FirebaseJobBridge
from agent.job_monitor import monitor_job

class JobProcessor:
    def __init__(self, 
                 device_id: str, 
                 storage_profiles: Dict[str, Any], 
                 config_path: str,
                 jobs_directory: str,
                 active_engines: Dict[str, Any],
                 bridge: FirebaseJobBridge) -> None:
        self.device_id = device_id
        self.storage_profiles = storage_profiles
        self.config_path = config_path
        self.jobs_directory = jobs_directory
        self.active_engines = active_engines
        self.bridge = bridge
        self.firestore_client = get_firestore_client()

    def process_job(self, job_id: str, job_data: Dict[str, Any]) -> None:
        """
        Processes an incoming PENDING job: resolves output path, schedules, 
        starts the engine, and attaches action listeners.
        """
        url = job_data.get("engine_config", {}).get("url")
        if not url:
            print(f"[Agent] No URL in job {job_id} — marking FAILED")
            self.bridge.transition_job(job_id, JobState.FAILED, "No URL provided")
            return

        engine_config = job_data.get("engine_config", {})
        requested_profile_id = engine_config.get("storage_profile_id", "default")
        destination_path_index = engine_config.get("destination_path_index", 0)
        sub_directory = engine_config.get("sub_directory", "").strip()
        
        profile = self.storage_profiles.get(requested_profile_id)
        if profile:
            paths = profile.get("paths", [])
            idx = max(0, min(int(destination_path_index), len(paths) - 1)) if paths else -1
            job_base_dir = paths[idx] if idx >= 0 else self.jobs_directory
        else:
            job_base_dir = self.jobs_directory

        try:
            safe_base = os.path.abspath(job_base_dir)
            os.makedirs(safe_base, exist_ok=True)

            requested_path = os.path.join(safe_base, sub_directory) if sub_directory else safe_base
            final_path = os.path.abspath(requested_path)

            if not final_path.startswith(safe_base):
                raise ValueError(f"Path Traversal Attempt! Blocked: {final_path}")

            output_path = final_path
            os.makedirs(output_path, exist_ok=True)

        except Exception as e:
            print(f"[Agent] Security or IO Error for job {job_id}: {e}")
            self.bridge.transition_job(job_id, JobState.FAILED, f"Directory Error: {e}")
            return

        # Update and persist complete path instead of relative
        if profile and sub_directory:
            profile_subfolders = profile.setdefault("subfolders", [])
            if output_path not in profile_subfolders:
                profile_subfolders.append(output_path)
                try:
                    update_device_presence_fields(self.device_id, {"storage_profiles": self.storage_profiles})
                    
                    with open(self.config_path, 'r') as f:
                        config_data = yaml.safe_load(f) or {}
                    
                    if "storage_profiles" in config_data and requested_profile_id in config_data["storage_profiles"]:
                        config_data["storage_profiles"][requested_profile_id]["subfolders"] = profile_subfolders
                        with open(self.config_path, 'w') as f:
                            yaml.safe_dump(config_data, f, default_flow_style=False, sort_keys=False)
                        print(f"[Agent] Saved new absolute subfolder '{output_path}' to profile {requested_profile_id}")
                except Exception as e:
                    print(f"[Agent] Error saving subfolder: {e}")

        print(f"[Agent] Job {job_id} — output: {output_path}")
        print(f"[Agent] Job {job_id} — URL   : {url}")

        # Read queue config from Firestore
        queue_id = engine_config.get("queue_id", "default")
        thread_limit = 4
        try:
            queue_doc = self.firestore_client.collection("queues").document(queue_id).get()
            if queue_doc.exists:
                queue_config = queue_doc.to_dict()
                if queue_config:
                    thread_limit = queue_config.get("max_threads_per_job", 4)
                    print(f"[Agent] Queue '{queue_id}' — threads: {thread_limit}")
            else:
                print(f"[Agent] Queue '{queue_id}' not found in Firestore, using defaults.")
        except Exception as e:
            print(f"[Agent] Warning: Could not read queue config: {e}")

        # Announce on RTDB immediately so frontend sees it
        update_job_rtdb_fields(job_id, {
            "state": JobState.PENDING.value,
            "device_id": self.device_id,
            "output_path": output_path,
            "url": url,
            "updated_at": datetime.isoformat(datetime.now()),
        })

        # Scheduled Download: Wait until scheduled_at
        scheduled_at_str = job_data.get("scheduled_at")
        if scheduled_at_str:
            try:
                scheduled_time = datetime.fromisoformat(scheduled_at_str)
                delay = (scheduled_time - datetime.now()).total_seconds()
                if delay > 0:
                    print(f"[Agent] Job {job_id} is scheduled for {scheduled_at_str}. Waiting {delay:.0f}s…")
                    update_job_rtdb_fields(job_id, {"scheduled_at": scheduled_at_str})
                    
                    while delay > 0:
                        time.sleep(1)
                        delay -= 1
                        current = self.bridge.get_job(job_id)
                        if current and current.state in {JobState.STOPPED, JobState.FAILED}:
                            print(f"[Agent] Job {job_id} was cancelled during scheduling wait. Aborting.")
                            return
                    print(f"[Agent] Schedule reached for job {job_id}. Starting download now.")
                else:
                    print(f"[Agent] Job {job_id} schedule was in the past ({scheduled_at_str}). Starting immediately.")
            except (ValueError, TypeError) as e:
                print(f"[Agent] Could not parse scheduled_at for job {job_id}: {e}. Starting immediately.")

        # Start engine based on URL or Type
        engine_type = engine_config.get("type", "aria2")
        is_youtube = any(domain in url.lower() for domain in ["youtube.com", "youtu.be"])
        
        if is_youtube or engine_type == "yt-dlp":
            print(f"[Agent] Routing job {job_id} to YTDLPEngine")
            engine = YTDLPEngine()
        else:
            print(f"[Agent] Routing job {job_id} to Aria2Engine")
            engine = Aria2Engine()
            
        self.active_engines[job_id] = engine

        gid = engine.start(job_id, url, output_path, self.bridge)

        if gid in (None, "ERROR", "ERROR_DAEMON_FAILED"):
            print(f"[Agent] Engine failed to start job {job_id} (GID={gid})")
            self.active_engines.pop(job_id, None)
            return

        print(f"[Agent] Job {job_id} handed to engine (GID={gid})")

        # Listen for manual control actions in RTDB
        action_ref = get_job_action_ref(job_id)
        
        def on_action(event: Any) -> None:
            action = event.data
            if not action: 
                return
            
            print(f"[Agent] Received action '{action}' for job {job_id}")
            if action == "PAUSE":
                engine.pause()
            elif action == "RESUME":
                engine.resume()
            elif action in ("CANCEL", "STOP"):
                engine.stop()
                
            try:
                delete_job_action(job_id)
            except Exception:
                pass
                
        action_listener = action_ref.listen(on_action)

        # Start monitoring thread
        monitor_thread = threading.Thread(
            target=monitor_job,
            args=(job_id, engine, gid, self.bridge, self.active_engines, action_listener, job_data),
            daemon=True,
            name=f"Monitor-{job_id}"
        )
        monitor_thread.start()
