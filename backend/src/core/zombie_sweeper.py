import threading
import time
from datetime import datetime

from .models import JobState
from .firebase_config import get_rtdb, get_db

class ZombieSweeper:
    """
    A background service that sweeps for orphaned 'zombie' jobs.
    Zombie Jobs are jobs in an active state assigned to an agent that has gone offline.
    """
    def __init__(self, interval_seconds: int = 120):
        self.interval_seconds = interval_seconds
        self.running = False
        self.thread = None
        self.rtdb = None
        self.db = None

    def start(self):
        if self.running:
            return
        
        # Initialize Firebase references lazily
        self.rtdb = get_rtdb()
        self.db = get_db()
        
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True, name="ZombieSweeperThread")
        self.thread.start()
        print(f"[ZombieSweeper] Started (Interval: {self.interval_seconds}s).")

    def stop(self):
        print("[ZombieSweeper] Stopping service...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)

    def _loop(self):
        while self.running:
            self._sweep()
            
            # Sleep in small increments to allow responsive shutdown
            for _ in range(self.interval_seconds):
                if not self.running:
                    break
                time.sleep(1)

    def _sweep(self):
        try:
            # 1. Identify offline devices
            offline_device_ids = set()
            presence_data = self.rtdb.child("presence").get()
            
            if presence_data:
                now_ms = int(time.time() * 1000)
                offline_threshold_ms = 120 * 1000  # 2 minutes
                
                for device_id, device_info in presence_data.items():
                    if not isinstance(device_info, dict): continue
                    
                    status = device_info.get("status", "offline")
                    last_seen = device_info.get("last_seen", 0)
                    
                    # Agent is offline if explicitly marked offline or stale heartbeat
                    if status == "offline" or (now_ms - last_seen > offline_threshold_ms):
                        offline_device_ids.add(device_id)

            if not offline_device_ids:
                return  # No offline devices to worry about

            # 2. Query Firestore for actively-executing jobs (NOT PENDING)
            # PENDING jobs are excluded because they may be legitimately assigned
            # to an offline device waiting to boot up (offline assignment feature).
            active_states = [JobState.RUNNING.value, JobState.PAUSED.value]
            
            docs = self.db.collection("jobs").where("state", "in", active_states).get()
            
            swept_count = 0
            for doc in docs:
                job_id = doc.id
                job_data = doc.to_dict()
                device_id = job_data.get("device_id")
                
                if device_id in offline_device_ids:
                    print(f"[ZombieSweeper] Sweeping orphaned job {job_id} assigned to offline device '{device_id}'.")
                    
                    now_str = datetime.isoformat(datetime.now())
                    error_msg = "Zombie Job Sweeper: Agent went offline abruptly"
                    new_state = JobState.FAILED.value
                    
                    # Mark FAILED in Firestore
                    self.db.collection("jobs").document(job_id).update({
                        "state": new_state,
                        "updated_at": now_str,
                        "error_reason": error_msg, # using error_reason for consistency, 'error' for rtdb below
                        "error": error_msg
                    })
                    
                    # Mark FAILED in RTDB
                    self.rtdb.child(f"jobs/{job_id}").update({
                        "state": new_state,
                        "updated_at": now_str,
                        "error": error_msg
                    })
                    swept_count += 1
                    
            if swept_count > 0:
                print(f"[ZombieSweeper] Swept {swept_count} zombie job(s).")
                
        except Exception as e:
            print(f"[ZombieSweeper] Error during sweep: {e}")
