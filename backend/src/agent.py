import os
import sys
import time
import uuid
import json
import socket
import threading
from datetime import datetime
from dotenv import load_dotenv

# Ensure the src directory is in the Python path so we can import core module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load env before importing firebase config
load_dotenv()

from core.firebase_config import initialize_firebase, get_rtdb, get_db

class HermesAgent:
    CONFIG_FILE = "agent_config.json"

    def __init__(self):
        self.device_id = self._get_or_create_device_id()
        self.hostname = socket.gethostname()
        self.platform = os.uname().sysname.lower() if hasattr(os, 'uname') else "unknown"
        self._job_listener = None

        # Initialize Firebase
        print(f"[Agent] Booting up HermesLink Worker...")
        print(f"[Agent] Device ID: {self.device_id}")
        initialize_firebase()
        self.rtdb = get_rtdb()
        self.db = get_db()
        self.presence_ref = self.rtdb.child(f'presence/{self.device_id}')

        # Must be called AFTER device_id is set
        self.download_directory = self._get_or_create_download_dir()
        os.makedirs(self.download_directory, exist_ok=True)
        print(f"[Agent] Download directory: {self.download_directory}")

    def _get_or_create_device_id(self) -> str:
        """Loads an existing device ID from config or generates a new one."""
        if os.path.exists(self.CONFIG_FILE):
            try:
                with open(self.CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    if 'device_id' in config:
                        return config['device_id']
            except Exception as e:
                print(f"[Agent] Warning: Could not read {self.CONFIG_FILE}: {e}")

        # Generate new ID
        new_id = f"device_{uuid.uuid4().hex[:12]}"
        try:
            with open(self.CONFIG_FILE, 'w') as f:
                json.dump({'device_id': new_id}, f, indent=2)
        except Exception as e:
            print(f"[Agent] Warning: Could not save new device ID to {self.CONFIG_FILE}: {e}")
        
        return new_id

    def _get_or_create_download_dir(self) -> str:
        """Loads an existing download directory from config or creates a sensible default."""
        default_dir = os.path.join(os.path.expanduser('~'), 'Downloads', 'HermesLink')
        if os.path.exists(self.CONFIG_FILE):
            try:
                with open(self.CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    download_dir = config.get('download_directory', default_dir)
                    # Persist if it wasn't already there
                    if 'download_directory' not in config:
                        config['download_directory'] = download_dir
                        with open(self.CONFIG_FILE, 'w') as fw:
                            json.dump(config, fw, indent=2)
                    return download_dir
            except Exception as e:
                print(f"[Agent] Warning: Could not read download_directory from {self.CONFIG_FILE}: {e}")

        # Fallback: write default to config
        try:
            config = {'device_id': self.device_id, 'download_directory': default_dir}
            with open(self.CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"[Agent] Warning: Could not save download_directory: {e}")

        return default_dir

    def connect(self):
        """Registers the device presence in RTDB."""
        print(f"[Agent] Connecting to Firebase RTDB Presence...")
        
        print("[Agent] Setting status to online...")
        self.presence_ref.set({
            "name": self.hostname,
            "platform": self.platform,
            "status": "online",
            "download_directory": self.download_directory,
            "started_at": int(time.time() * 1000),
            "last_seen": int(time.time() * 1000)
        })
        
        print(f"[Agent] Device {self.hostname} ({self.device_id}) is now ONLINE.")
        print(f"[Agent] Downloads will be saved to: {self.download_directory}")

    def _attach_job_listener(self):
        """Attaches a Firestore real-time listener for PENDING jobs assigned to this device."""
        print(f"[Agent] Attaching Firestore listener for jobs on device_id='{self.device_id}'...")

        jobs_ref = (
            self.db.collection('jobs')
            .where('device_id', '==', self.device_id)
            .where('state', '==', 'PENDING')
        )

        def on_snapshot(col_snapshot, changes, read_time):
            for change in changes:
                if change.type.name == 'ADDED':
                    job_doc = change.document
                    job_id = job_doc.id
                    job_data = job_doc.to_dict()
                    print(f"\n[Agent] >>> New PENDING job detected: {job_id}")
                    # Process in a separate thread to not block the listener
                    t = threading.Thread(target=self._process_job, args=(job_id, job_data), daemon=True)
                    t.start()

        self._job_listener = jobs_ref.on_snapshot(on_snapshot)
        print(f"[Agent] Listening for jobs. Waiting for work...")

    def _process_job(self, job_id: str, job_data: dict):
        """Handles a single job: lock it, simulate execution, then mark complete."""
        job_ref = self.db.collection('jobs').document(job_id)

        # Determine effective download directory (job can override agent default)
        job_download_dir = job_data.get('engine_config', {}).get('destination') or self.download_directory
        os.makedirs(job_download_dir, exist_ok=True)
        print(f"[Agent] Job {job_id} → download directory: {job_download_dir}")

        # Step 1: Lock the job to prevent double-execution
        print(f"[Agent] Locking Job {job_id} (setting state -> RUNNING)...")
        try:
            job_ref.update({
                'state': 'RUNNING',
                'updated_at': datetime.isoformat(datetime.now())
            })
        except Exception as e:
            print(f"[Agent] Failed to lock job {job_id}: {e}")
            return

        # Step 2: Simulate download / job execution
        print(f"[Agent] Executing job {job_id}. Simulating work (5 seconds)...")
        for i in range(1, 6):
            time.sleep(1)
            progress = {"percent": i * 20, "step": f"{i}/5"}
            print(f"[Agent]   Job {job_id} progress: {progress['percent']}%")
            # Throttled progress update — only write on every 2nd second
            if i % 2 == 0 or i == 5:
                try:
                    job_ref.update({
                        'progress': progress,
                        'updated_at': datetime.isoformat(datetime.now())
                    })
                except Exception as e:
                    print(f"[Agent] Warning: Could not write progress for {job_id}: {e}")

        # Step 3: Mark job as completed
        print(f"[Agent] Job {job_id} COMPLETED.")
        try:
            job_ref.update({
                'state': 'COMPLETED',
                'updated_at': datetime.isoformat(datetime.now())
            })
        except Exception as e:
            print(f"[Agent] Failed to mark job {job_id} as COMPLETED: {e}")

    def run_forever(self):
        """Main idle loop for the daemon. Pings RTDB presence and listens for jobs."""
        self.connect()
        self._attach_job_listener()
        print("[Agent] Entering idle loop. Sending heartbeats every 30s. Press Ctrl+C to shutdown.")
        try:
            while True:
                self.presence_ref.update({
                    "last_seen": int(time.time() * 1000)
                })
                time.sleep(30) 
        except KeyboardInterrupt:
            self._shutdown()

    def _shutdown(self):
        """Graceful shutdown hook."""
        print("\n[Agent] Shutting down gracefully...")
        if self._job_listener:
            self._job_listener.unsubscribe()
            print("[Agent] Firestore job listener detached.")
        try:
            self.presence_ref.update({
                "status": "offline",
                "last_seen": int(time.time() * 1000)
            })
            print("[Agent] Marked as offline.")
        except Exception as e:
            print(f"[Agent] Error during shutdown status update: {e}")

if __name__ == "__main__":
    agent = HermesAgent()
    agent.run_forever()
