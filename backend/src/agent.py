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
from google.cloud.firestore_v1.base_query import FieldFilter


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

    CONFIG_FILE = "agent_config.json"
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
        base_dir = os.path.join(os.path.expanduser("~"), "Downloads", "HermesLink")
        self.download_directory = os.path.join(base_dir, self.device_id)
        self.jobs_dir = os.path.join(self.download_directory, "jobs")

        os.makedirs(self.jobs_dir, exist_ok=True)
        print(f"[Agent] Fallback Download root : {self.download_directory}")
        
        # Load Storage Profiles
        self.storage_profiles = {}
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config.yaml")
        self.config_path = config_path
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

    def _recover_crash(self):
        """Finds any assigned jobs stuck in RUNNING or PAUSED and reverts them to PENDING."""
        print(f"[Agent] Checking for orphaned active jobs from previous sessions...")
        try:
            active_jobs = self.db.collection("jobs").where(filter=FieldFilter("device_id", "==", self.device_id)).where(filter=FieldFilter("state", "in", ["RUNNING", "PAUSED"])).get()
            
            recovered_count = 0
            for doc in active_jobs:
                job_id = doc.id
                print(f"[Agent] Recovering interrupted job: {job_id}")
                
                # Update both Firestore and RTDB to PENDING
                # This ensures the active listener picks it up and restarts it
                self.db.collection("jobs").document(job_id).update({
                    "state": JobState.PENDING.value,
                    "updated_at": datetime.isoformat(datetime.now()),
                    "error": "System Restarted Unexpectedly (Crash Recovery)"
                })
                self._bridge._job_rtdb_ref(job_id).update({
                    "state": JobState.PENDING.value,
                    "updated_at": datetime.isoformat(datetime.now())
                })
                recovered_count += 1
                
            if recovered_count > 0:
                print(f"[Agent] Recovered {recovered_count} job(s) to PENDING state.")
        except Exception as e:
            print(f"[Agent] Crash recovery failed: {e}")

    # ── Job Listener (Firestore) ───────────────────────────────

    def _attach_job_listener(self):
        """Watch Firestore for PENDING jobs assigned to this device."""
        print(f"[Agent] Listening for PENDING jobs (device_id={self.device_id})…")

        jobs_ref = (
            self.db.collection("jobs")
            .where(filter=FieldFilter("device_id", "==", self.device_id))
            .where(filter=FieldFilter("state", "==", "PENDING"))
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
        sub_directory = engine_config.get("sub_directory", "").strip()

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

        # Update and persist complete path instead of relative
        if profile and sub_directory:
            profile_subfolders = profile.setdefault("subfolders", [])
            if output_path not in profile_subfolders:
                profile_subfolders.append(output_path)
                try:
                    # Update Firebase Presence
                    self.presence_ref.update({"storage_profiles": self.storage_profiles})
                    
                    # Update config.yaml safely
                    with open(self.config_path, 'r') as f:
                        cfg = yaml.safe_load(f) or {}
                    
                    if "storage_profiles" in cfg and requested_profile_id in cfg["storage_profiles"]:
                        cfg["storage_profiles"][requested_profile_id]["subfolders"] = profile_subfolders
                        with open(self.config_path, 'w') as f:
                            yaml.safe_dump(cfg, f, default_flow_style=False, sort_keys=False)
                        print(f"[Agent] Saved new absolute subfolder '{output_path}' to profile {requested_profile_id}")
                except Exception as e:
                    print(f"[Agent] Error saving subfolder: {e}")

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

        # ── Scheduled Download: Wait until scheduled_at ───────
        scheduled_at_str = job_data.get("scheduled_at")
        if scheduled_at_str:
            try:
                scheduled_time = datetime.fromisoformat(scheduled_at_str)
                delay = (scheduled_time - datetime.now()).total_seconds()
                if delay > 0:
                    print(f"[Agent] Job {job_id} is scheduled for {scheduled_at_str}. Waiting {delay:.0f}s…")
                    self._bridge._job_rtdb_ref(job_id).update({
                        "scheduled_at": scheduled_at_str,
                    })
                    # Sleep in 1s increments so we can react to external cancellation
                    while delay > 0:
                        time.sleep(1)
                        delay -= 1
                        # Check if the job was cancelled/stopped while waiting
                        current = self._bridge.get_job(job_id)
                        if current and current.state in {JobState.STOPPED, JobState.FAILED}:
                            print(f"[Agent] Job {job_id} was cancelled during scheduling wait. Aborting.")
                            return
                    print(f"[Agent] Schedule reached for job {job_id}. Starting download now.")
                else:
                    print(f"[Agent] Job {job_id} schedule was in the past ({scheduled_at_str}). Starting immediately.")
            except (ValueError, TypeError) as e:
                print(f"[Agent] Could not parse scheduled_at for job {job_id}: {e}. Starting immediately.")

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

        print(f"[Agent] Job {job_id} handed to engine (GID={gid})")

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
            args=(job_id, engine, gid, action_listener, job_data),
            daemon=True,
        )
        monitor_thread.start()

    # ── Monitor Thread ────────────────────────────────────────

    def _monitor_job(self, job_id: str, engine, gid: str, action_listener=None, job_data: dict = None):
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
                
                # Post-download: Auto-extract archives if requested
                if current.state == JobState.COMPLETED and job_data:
                    auto_extract = job_data.get("engine_config", {}).get("auto_extract", False)
                    if auto_extract:
                        self._extract_archive(job_id, current)
                break

        self._active_engines.pop(job_id, None)
        if action_listener:
            try:
                action_listener.close()
            except Exception:
                pass
        print(f"[Monitor] Job {job_id} monitor exited.")

    # ── Archive Extraction ────────────────────────────────────

    def _extract_archive(self, job_id: str, job):
        """Attempts to extract the downloaded file if it is an archive."""
        import zipfile
        import tarfile
        import shutil
        
        ARCHIVE_EXTENSIONS = (".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tar.xz", ".gz", ".rar")
        
        # 1. Try to get the exact file path from RTDB progress (written by engine at COMPLETED)
        rtdb_data = self._bridge._job_rtdb_ref(job_id).get() or {}
        progress = rtdb_data.get("progress", {})
        file_path = progress.get("file_path", "")
        
        archive_files = []
        if file_path and os.path.isfile(file_path):
            # Check if the downloaded file is actually an archive
            if any(file_path.lower().endswith(ext) for ext in ARCHIVE_EXTENSIONS):
                archive_files.append(file_path)
                print(f"[Extract] Found archive via engine file_path: {file_path}")
            else:
                print(f"[Extract] Downloaded file is not an archive: {file_path}")
                return
        else:
            # 2. Fallback: scan the output directory recursively
            output_path = rtdb_data.get("output_path", "")
            if not output_path or not os.path.isdir(output_path):
                print(f"[Extract] No valid output_path for job {job_id}. Skipping.")
                return
            
            print(f"[Extract] file_path not available, scanning {output_path} recursively...")
            for root, dirs, files in os.walk(output_path):
                for f in files:
                    if any(f.lower().endswith(ext) for ext in ARCHIVE_EXTENSIONS):
                        archive_files.append(os.path.join(root, f))
        
        if not archive_files:
            print(f"[Extract] No archive files found for job {job_id}.")
            return
        
        for archive_path in archive_files:
            filename = os.path.basename(archive_path)
            print(f"[Extract] Extracting: {filename}")
            
            # Report extraction status via RTDB
            self._bridge._job_rtdb_ref(job_id).update({
                "progress": {
                    "filename": f"📦 Extracting: {filename}",
                    "percent": 100,
                }
            })
            
            try:
                # Extract into a subfolder named after the archive (prevents overwrites)
                archive_parent = os.path.dirname(archive_path)
                base_name = filename
                for ext in (".tar.gz", ".tar.bz2", ".tar.xz", ".tgz", ".tar", ".zip", ".gz", ".rar"):
                    if base_name.lower().endswith(ext):
                        base_name = base_name[:len(base_name) - len(ext)]
                        break
                extract_dir = os.path.join(archive_parent, base_name)
                os.makedirs(extract_dir, exist_ok=True)
                
                if zipfile.is_zipfile(archive_path):
                    with zipfile.ZipFile(archive_path, 'r') as zf:
                        zf.extractall(extract_dir)
                elif tarfile.is_tarfile(archive_path):
                    with tarfile.open(archive_path, 'r:*') as tf:
                        tf.extractall(extract_dir)
                else:
                    try:
                        shutil.unpack_archive(archive_path, extract_dir)
                    except Exception:
                        print(f"[Extract] Unsupported archive format: {filename}")
                        continue
                
                print(f"[Extract] Successfully extracted: {filename} → {extract_dir}")
                
            except Exception as e:
                print(f"[Extract] Failed to extract {filename}: {e}")
        
        # Update progress to show extraction complete
        self._bridge._job_rtdb_ref(job_id).update({
            "progress": {
                "filename": f"✅ Extracted {len(archive_files)} archive(s)",
                "percent": 100,
            }
        })

    # ── Main Loop ─────────────────────────────────────────────

    def run_forever(self):
        self._go_online()
        self._recover_crash()
        self._attach_job_listener()

        print("[Agent] Running… (Ctrl+C to stop)")

        import signal
        def handle_sigterm(signum, frame):
            print("\n[Agent] SIGTERM received.")
            self._shutdown()
            sys.exit(0)

        signal.signal(signal.SIGTERM, handle_sigterm)

        try:
            while True:
                self._heartbeat()
                time.sleep(30)
        except (KeyboardInterrupt, SystemExit):
            self._shutdown()
        except Exception as e:
            print(f"[Agent] Unexpected error in main loop: {e}")
            self._shutdown()

    def _shutdown(self):
        print("\n[Agent] Shutting down…")

        if self._job_listener:
            self._job_listener.unsubscribe()

        # Cancel all active downloads
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
