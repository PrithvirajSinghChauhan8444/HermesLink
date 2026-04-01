import os
import sys
import time
import uuid
import socket
import threading
import yaml
from datetime import datetime

# Ensure src path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from core.firebase_config import initialize_firebase, get_rtdb, get_db
from core.models import JobState
from engines.aria2 import Aria2Engine
from engines.yt_dlp import YTDLPEngine


# ─────────────────────────────────────────────────────────────
# FirestoreJobBridge
#   Bridges the engine's job_manager calls to Firebase RTDB.
#   Firestore is only used for the job listener (PENDING queries).
#   All live state / progress goes to RTDB for low-latency reads.
# ─────────────────────────────────────────────────────────────
class FirebaseJobBridge:
    """Translates Aria2Engine callbacks into RTDB + Firestore writes."""

    def __init__(self, rtdb, db):
        self.rtdb = rtdb   # Realtime Database root reference
        self.db = db       # Firestore client (state sync only)

    def _job_rtdb_ref(self, job_id: str):
        return self.rtdb.child(f"jobs/{job_id}")

    # Called by Aria2Engine to change job state
    def transition_job(self, job_id: str, new_state: JobState, error_reason: str = None):
        now = datetime.isoformat(datetime.now())
        update = {
            "state": new_state.value,
            "updated_at": now,
        }
        if error_reason:
            update["error"] = error_reason

        # RTDB — fast, frontend reads this
        self._job_rtdb_ref(job_id).update(update)

        # Firestore — keep state in sync so queries still work
        try:
            fs_update = {"state": new_state.value, "updated_at": now}
            if error_reason:
                fs_update["error"] = error_reason
            
            TERMINAL_STATES = ["COMPLETED", "FAILED", "STOPPED"]
            if new_state.value in TERMINAL_STATES:
                rtdb_data = self._job_rtdb_ref(job_id).get()
                if rtdb_data and "progress" in rtdb_data:
                    fs_update["progress"] = rtdb_data["progress"]

            self.db.collection("jobs").document(job_id).update(fs_update)
        except Exception as e:
            print(f"[Bridge] Firestore state sync failed for {job_id}: {e}")

        print(f"[Bridge] Job {job_id} → {new_state.value}"
              + (f" ({error_reason})" if error_reason else ""))

    # Called by Aria2Engine to report download progress
    def update_progress(self, job_id: str, progress: dict):
        self._job_rtdb_ref(job_id).update({"progress": progress})
        # No Firestore write for progress — too noisy, RTDB is enough

    # Required by Aria2Engine.sync_state() to check current state
    def get_job(self, job_id: str):
        data = self._job_rtdb_ref(job_id).get()
        if data:
            from core.models import Job
            return Job.from_dict(data)
        # Fall back to Firestore
        doc = self.db.collection("jobs").document(job_id).get()
        if doc.exists:
            from core.models import Job
            return Job.from_dict(doc.to_dict())
        return None


# ─────────────────────────────────────────────────────────────
# HermesAgent
# ─────────────────────────────────────────────────────────────
class HermesAgent:

    CONFIG_FILE = "test_agent_config.json"
    MONITOR_INTERVAL_SECONDS = 5   # how often to ask aria2 for progress

    def __init__(self):
        self.device_id, self.hostname = self._load_or_create_device_config()
        self.platform = os.uname().sysname.lower() if hasattr(os, "uname") else "unknown"

        self._job_listener = None
        self._active_engines: dict = {}   # job_id → Aria2Engine

        print(f"[Agent] Booting HermesLink Worker…")
        print(f"[Agent] Persistent Device ID: {self.device_id}")

        # Firebase
        initialize_firebase()
        self.rtdb = get_rtdb()
        self.db = get_db()

        self._bridge = FirebaseJobBridge(self.rtdb, self.db)

        # Presence node
        self.presence_ref = self.rtdb.child(f"presence/{self.device_id}")

        # Download root (Fallback)
        base_dir = os.path.join(os.path.expanduser("~"), "Downloads", "HermesLink_Test")
        self.download_directory = os.path.join(base_dir, self.device_id)
        self.jobs_dir = os.path.join(self.download_directory, "jobs")

        os.makedirs(self.jobs_dir, exist_ok=True)
        print(f"[Agent] Fallback Download root : {self.download_directory}")
        
        # Load Storage Profiles
        self.storage_profiles = {}
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config.yaml")
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                if config and "storage_profiles" in config:
                    for p_id, p_data in config["storage_profiles"].items():
                        # Backward compat: migrate old singular "path" → "paths" list
                        if "path" in p_data and "paths" not in p_data:
                            p_data["paths"] = [p_data.pop("path")]
                        # Expand ~ and resolve each path
                        raw_paths = p_data.get("paths", [])
                        expanded = [os.path.expanduser(p) for p in raw_paths]
                        p_data["paths"] = expanded
                        # Derive human-friendly base names from last folder segment
                        p_data["base_names"] = [os.path.basename(p.rstrip("/")) or p for p in expanded]
                        # Remove legacy key if still present
                        p_data.pop("path", None)
                    self.storage_profiles = config["storage_profiles"]
                    total_paths = sum(len(p.get("paths", [])) for p in self.storage_profiles.values())
                    print(f"[Agent] Loaded {len(self.storage_profiles)} storage profiles ({total_paths} total paths).")
        except Exception as e:
            print(f"[Agent] Warning: Could not load config.yaml: {e}")

    # ── Device Config ──────────────────────────────────────────

    def _load_or_create_device_config(self) -> tuple[str, str]:
        import json
        
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), self.CONFIG_FILE)
        config = {}
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
            except Exception as e:
                print(f"[Agent] Warning: Could not read {config_path}: {e}")

        dirty = False
        
        if 'device_id' not in config:
            config['device_id'] = f"device_{uuid.uuid4().hex[:12]}"
            dirty = True
            
        if 'device_name' not in config:
            config['device_name'] = socket.gethostname()
            dirty = True
            
        if dirty:
            try:
                with open(config_path, 'w') as f:
                    json.dump(config, f, indent=2)
            except Exception as e:
                print(f"[Agent] Warning: Could not save device config to {config_path}: {e}")
        
        return config['device_id'], config['device_name']

    # ── Presence ──────────────────────────────────────────────

    def _go_online(self):
        print(f"[Agent] Registering presence in RTDB…")
        self.presence_ref.set({
            "name": self.hostname,
            "platform": self.platform,
            "status": "online",
            "device_id": self.device_id,
            "download_directory": self.download_directory,
            "storage_profiles": self.storage_profiles,
            "started_at": int(time.time() * 1000),
            "last_seen": int(time.time() * 1000),
        })
        print(f"[Agent] {self.hostname} ({self.device_id}) ONLINE")

    def _heartbeat(self):
        self.presence_ref.update({"last_seen": int(time.time() * 1000)})

    # ── Job Listener (Firestore) ───────────────────────────────

    def _attach_job_listener(self):
        """Watch Firestore for PENDING jobs assigned to this device."""
        print(f"[Agent] Listening for PENDING jobs (device_id={self.device_id})…")

        jobs_ref = (
            self.db.collection("jobs")
            .where("device_id", "==", self.device_id)
            .where("state", "==", "PENDING")
        )

        def on_snapshot(col_snapshot, changes, read_time):
            for change in changes:
                if change.type.name == "ADDED":
                    job_doc = change.document
                    job_id = job_doc.id
                    job_data = job_doc.to_dict()

                    print(f"\n[Agent] >>> New job detected: {job_id}")

                    t = threading.Thread(
                        target=self._process_job,
                        args=(job_id, job_data),
                        daemon=True,
                    )
                    t.start()

        self._job_listener = jobs_ref.on_snapshot(on_snapshot)

    # ── Job Processing ────────────────────────────────────────

    def _process_job(self, job_id: str, job_data: dict):
        """
        Hands the job off to Aria2Engine and starts a monitoring thread.
        The agent never touches the file bytes — aria2c does.
        """
        url = job_data.get("engine_config", {}).get("url")
        if not url:
            print(f"[Agent] No URL in job {job_id} — marking FAILED")
            self._bridge.transition_job(job_id, JobState.FAILED, "No URL provided")
            return

        # ── Resolve Output Directory ───────────────────────────
        # Determine base directory based on selected storage profile + destination path
        engine_config = job_data.get("engine_config", {})
        requested_profile_id = engine_config.get("storage_profile_id", "default")
        destination_path_index = engine_config.get("destination_path_index", 0)
        sub_directory = engine_config.get("sub_directory", "")

        profile = self.storage_profiles.get(requested_profile_id)
        if profile:
            paths = profile.get("paths", [])
            # Clamp index to valid range
            idx = max(0, min(int(destination_path_index), len(paths) - 1)) if paths else -1
            job_base_dir = paths[idx] if idx >= 0 else self.jobs_dir
        else:
            job_base_dir = self.jobs_dir

        try:
            safe_base = os.path.abspath(job_base_dir)

            # Security: Ensure base path is created (so we can download to it)
            os.makedirs(safe_base, exist_ok=True)

            requested_path = os.path.join(safe_base, sub_directory) if sub_directory else safe_base
            final_path = os.path.abspath(requested_path)

            if not final_path.startswith(safe_base):
                raise ValueError(f"Path Traversal Attempt! Blocked: {final_path}")

            # Download directly into the resolved path (no job_id subfolder)
            output_path = final_path
            os.makedirs(output_path, exist_ok=True)

        except Exception as e:
            print(f"[Agent] Security or IO Error for job {job_id}: {e}")
            self._bridge.transition_job(job_id, JobState.FAILED, f"Directory Error: {e}")
            return

        print(f"[Agent] Job {job_id} — output: {output_path}")
        print(f"[Agent] Job {job_id} — URL   : {url}")

        # ── Read queue config from Firestore ──────────────────
        queue_id = engine_config.get("queue_id", "default")
        thread_limit = 4  # fallback
        try:
            queue_doc = self.db.collection("queues").document(queue_id).get()
            if queue_doc.exists:
                queue_config = queue_doc.to_dict()
                thread_limit = queue_config.get("max_threads_per_job", 4)
                print(f"[Agent] Queue '{queue_id}' — threads: {thread_limit}, parallel: {queue_config.get('max_parallel_jobs', 2)}")
            else:
                print(f"[Agent] Queue '{queue_id}' not found in Firestore, using defaults.")
        except Exception as e:
            print(f"[Agent] Warning: Could not read queue config: {e}")

        # ── Announce on RTDB immediately so frontend sees it ──
        self._bridge._job_rtdb_ref(job_id).update({
            "state": JobState.PENDING.value,
            "device_id": self.device_id,
            "output_path": output_path,
            "url": url,
            "updated_at": datetime.isoformat(datetime.now()),
        })

        # ── Start engine based on URL or Type ───────────────
        engine_type = engine_config.get("type", "aria2")
        is_youtube = any(domain in url.lower() for domain in ["youtube.com", "youtu.be"])
        
        if is_youtube or engine_type == "yt-dlp":
            print(f"[Agent] Routing job {job_id} to YTDLPEngine")
            engine = YTDLPEngine()
        else:
            print(f"[Agent] Routing job {job_id} to Aria2Engine")
            engine = Aria2Engine()
            
        self._active_engines[job_id] = engine

        gid = engine.start(job_id, url, output_path, self._bridge)

        if gid in (None, "ERROR", "ERROR_DAEMON_FAILED"):
            print(f"[Agent] Engine failed to start job {job_id} (GID={gid})")
            self._active_engines.pop(job_id, None)
            return  # engine already called transition_job → FAILED

        print(f"[Agent] Job {job_id} handed to aria2 (GID={gid})")

        # ── Listen for manual control actions ─────────────────
        action_ref = self._bridge._job_rtdb_ref(job_id).child("action")
        
        def on_action(event):
            action = event.data
            if not action: return
            
            print(f"[Agent] Received action '{action}' for job {job_id}")
            if action == "PAUSE":
                engine.pause()
            elif action == "RESUME":
                engine.resume()
            elif action in ("CANCEL", "STOP"):
                engine.stop()
                
            # clear the action node so we don't process it repeatedly
            try:
                action_ref.delete()
            except Exception:
                pass
                
        action_listener = action_ref.listen(on_action)

        # ── Start monitoring thread ───────────────────────────
        monitor_thread = threading.Thread(
            target=self._monitor_job,
            args=(job_id, engine, gid, action_listener),
            daemon=True,
        )
        monitor_thread.start()

    # ── Monitor Thread ────────────────────────────────────────

    def _monitor_job(self, job_id: str, engine, gid: str, action_listener=None):
        """
        Polls the engine every MONITOR_INTERVAL_SECONDS seconds.
        Aria2Engine.sync_state() pulls aria2 status via RPC.
        YTDLPEngine.sync_state() is mostly a passive stub while its thread updates.
        bridge.update_progress / bridge.transition_job automatically.
        Exits when the job reaches a terminal state.
        """
        TERMINAL = {JobState.COMPLETED, JobState.FAILED, JobState.STOPPED}
        print(f"[Monitor] Watching job {job_id} (GID={gid}) every "
              f"{self.MONITOR_INTERVAL_SECONDS}s…")

        while True:
            time.sleep(self.MONITOR_INTERVAL_SECONDS)

            try:
                engine.sync_state(job_id, self._bridge)
            except Exception as e:
                print(f"[Monitor] sync_state error for {job_id}: {e}")

            # Check if terminal
            current = self._bridge.get_job(job_id)
            if current and current.state in TERMINAL:
                print(f"[Monitor] Job {job_id} reached terminal state: "
                      f"{current.state.value}. Stopping monitor.")
                break

        self._active_engines.pop(job_id, None)
        if action_listener:
            try:
                action_listener.close()
            except Exception:
                pass
        print(f"[Monitor] Job {job_id} monitor exited.")

    # ── Main Loop ─────────────────────────────────────────────

    def run_forever(self):
        self._go_online()
        self._attach_job_listener()

        print("[Agent] Running… (Ctrl+C to stop)")

        try:
            while True:
                self._heartbeat()
                time.sleep(30)
        except KeyboardInterrupt:
            self._shutdown()

    def _shutdown(self):
        print("\n[Agent] Shutting down…")

        if self._job_listener:
            self._job_listener.unsubscribe()

        # Cancel all active aria2 downloads
        for job_id, engine in list(self._active_engines.items()):
            print(f"[Agent] Cancelling active job: {job_id}")
            try:
                engine.cancel()
            except Exception:
                pass

        try:
            self.presence_ref.update({
                "status": "offline",
                "last_seen": int(time.time() * 1000),
            })
        except Exception:
            pass

        print("[Agent] Goodbye.")


if __name__ == "__main__":
    agent = HermesAgent()
    agent.run_forever()