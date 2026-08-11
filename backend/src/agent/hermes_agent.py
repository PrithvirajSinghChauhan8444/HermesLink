import os
import sys
import time
import uuid
import socket
import threading
import yaml
import json
import signal
from datetime import datetime
from typing import Dict, Any, Tuple, Optional

# Ensure src path is in Python path if running directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from firebase import (
    initialize_firebase,
    get_firestore_client,
    set_device_online,
    update_device_heartbeat,
    set_device_offline,
    update_job_rtdb_fields,
)
from models import JobState
from google.cloud.firestore_v1.base_query import FieldFilter
from agent.job_bridge import FirebaseJobBridge
from agent.job_processor import JobProcessor

class HermesAgent:
    CONFIG_FILE = "agent_config.json"

    def __init__(self) -> None:
        self.device_id, self.hostname = self._load_or_create_device_config()
        self.platform = os.uname().sysname.lower() if hasattr(os, "uname") else "unknown"

        self._job_listener: Optional[Any] = None
        self._active_engines: Dict[str, Any] = {}

        print(f"[Agent] Booting HermesLink Worker…")
        print(f"[Agent] Persistent Device ID: {self.device_id}")

        initialize_firebase()
        self.firestore_client = get_firestore_client()
        self._bridge = FirebaseJobBridge()

        # Download directory fallbacks
        base_dir = os.path.join(os.path.expanduser("~"), "Downloads", "HermesLink")
        self.download_directory = os.path.join(base_dir, self.device_id)
        self.jobs_dir = os.path.join(self.download_directory, "jobs")
        os.makedirs(self.jobs_dir, exist_ok=True)
        print(f"[Agent] Fallback Download root : {self.download_directory}")
        
        # Load Storage Profiles
        self.storage_profiles: Dict[str, Any] = {}
        src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.config_path = os.path.join(src_dir, "..", "config.yaml")
        
        self._load_storage_profiles()

        # Job processor instance
        self.processor = JobProcessor(
            device_id=self.device_id,
            storage_profiles=self.storage_profiles,
            config_path=self.config_path,
            jobs_directory=self.jobs_dir,
            active_engines=self._active_engines,
            bridge=self._bridge
        )

    def _load_storage_profiles(self) -> None:
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    config = yaml.safe_load(f)
                    if config and "storage_profiles" in config:
                        for p_id, p_data in config["storage_profiles"].items():
                            if "path" in p_data and "paths" not in p_data:
                                p_data["paths"] = [p_data.pop("path")]
                            
                            raw_paths = p_data.get("paths", [])
                            expanded = [os.path.expanduser(p) for p in raw_paths]
                            p_data["paths"] = expanded
                            p_data["base_names"] = [os.path.basename(p.rstrip("/")) or p for p in expanded]
                            p_data.pop("path", None)
                        self.storage_profiles = config["storage_profiles"]
                        total_paths = sum(len(p.get("paths", [])) for p in self.storage_profiles.values())
                        print(f"[Agent] Loaded {len(self.storage_profiles)} storage profiles ({total_paths} total paths).")
        except Exception as e:
            print(f"[Agent] Warning: Could not load config.yaml: {e}")

    def _load_or_create_device_config(self) -> Tuple[str, str]:
        src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(src_dir, self.CONFIG_FILE)
        config: Dict[str, Any] = {}
        
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

    def _go_online(self) -> None:
        print(f"[Agent] Registering presence in RTDB…")
        presence_payload = {
            "name": self.hostname,
            "platform": self.platform,
            "status": "online",
            "device_id": self.device_id,
            "download_directory": self.download_directory,
            "storage_profiles": self.storage_profiles,
            "started_at": int(time.time() * 1000),
            "last_seen": int(time.time() * 1000),
        }
        set_device_online(self.device_id, presence_payload)
        print(f"[Agent] {self.hostname} ({self.device_id}) ONLINE")

    def _heartbeat(self) -> None:
        update_device_heartbeat(self.device_id, int(time.time() * 1000))

    def _recover_crash(self) -> None:
        """Finds any assigned jobs stuck in RUNNING or PAUSED and reverts them to PENDING."""
        print(f"[Agent] Checking for orphaned active jobs from previous sessions...")
        try:
            active_jobs = (
                self.firestore_client.collection("jobs")
                .where(filter=FieldFilter("device_id", "==", self.device_id))
                .where(filter=FieldFilter("state", "in", ["RUNNING", "PAUSED"]))
                .get()
            )
            
            recovered_count = 0
            for doc in active_jobs:
                job_id = doc.id
                print(f"[Agent] Recovering interrupted job: {job_id}")
                
                # Update Firestore and RTDB to PENDING
                self.firestore_client.collection("jobs").document(job_id).update({
                    "state": JobState.PENDING.value,
                    "updated_at": datetime.isoformat(datetime.now()),
                    "error": "System Restarted Unexpectedly (Crash Recovery)"
                })
                update_job_rtdb_fields(job_id, {
                    "state": JobState.PENDING.value,
                    "updated_at": datetime.isoformat(datetime.now())
                })
                recovered_count += 1
                
            if recovered_count > 0:
                print(f"[Agent] Recovered {recovered_count} job(s) to PENDING state.")
        except Exception as e:
            print(f"[Agent] Crash recovery failed: {e}")

    def _attach_job_listener(self) -> None:
        """Watch Firestore for PENDING jobs assigned to this device."""
        print(f"[Agent] Listening for PENDING jobs (device_id={self.device_id})…")

        jobs_ref = (
            self.firestore_client.collection("jobs")
            .where(filter=FieldFilter("device_id", "==", self.device_id))
            .where(filter=FieldFilter("state", "==", "PENDING"))
        )

        def on_snapshot(col_snapshot: Any, changes: list, read_time: Any) -> None:
            for change in changes:
                if change.type.name == "ADDED":
                    job_doc = change.document
                    job_id = job_doc.id
                    job_data = job_doc.to_dict()

                    print(f"\n[Agent] >>> New job detected: {job_id}")

                    t = threading.Thread(
                        target=self.processor.process_job,
                        args=(job_id, job_data),
                        daemon=True,
                        name=f"Processor-{job_id}"
                    )
                    t.start()

        self._job_listener = jobs_ref.on_snapshot(on_snapshot)

    def run_forever(self) -> None:
        self._go_online()
        self._recover_crash()
        self._attach_job_listener()

        print("[Agent] Running… (Ctrl+C to stop)")

        def handle_sigterm(signum: int, frame: Any) -> None:
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

    def _shutdown(self) -> None:
        print("\n[Agent] Shutting down…")

        if self._job_listener:
            try:
                self._job_listener.unsubscribe()
            except Exception:
                pass

        # Cancel all active downloads
        for job_id, engine in list(self._active_engines.items()):
            print(f"[Agent] Cancelling active job: {job_id}")
            try:
                engine.cancel()
            except Exception:
                pass

        try:
            set_device_offline(self.device_id, int(time.time() * 1000))
        except Exception:
            pass

        print("[Agent] Goodbye.")

if __name__ == "__main__":
    agent = HermesAgent()
    agent.run_forever()
