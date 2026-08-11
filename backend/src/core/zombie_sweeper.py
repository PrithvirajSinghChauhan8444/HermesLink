import threading
import time
from datetime import datetime
from typing import Optional, Set
from models import JobState
from firebase import get_realtime_database_reference, get_firestore_client
from google.cloud.firestore_v1.base_query import FieldFilter

class ZombieSweeper:
    """
    A background service that sweeps for orphaned 'zombie' jobs.
    Zombie Jobs are jobs in an active state assigned to an agent that has gone offline.
    """
    def __init__(self, interval_seconds: int = 120):
        self.interval_seconds = interval_seconds
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.realtime_database: Any = None
        self.firestore_client: Any = None

    def start(self) -> None:
        if self.running:
            return
        
        self.realtime_database = get_realtime_database_reference()
        self.firestore_client = get_firestore_client()
        
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True, name="ZombieSweeperThread")
        self.thread.start()
        print(f"[ZombieSweeper] Started (Interval: {self.interval_seconds}s).")

    def stop(self) -> None:
        print("[ZombieSweeper] Stopping service...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)

    def _loop(self) -> None:
        while self.running:
            self._sweep()
            
            for _ in range(self.interval_seconds):
                if not self.running:
                    break
                time.sleep(1)

    def _sweep(self) -> None:
        try:
            offline_device_ids: Set[str] = set()
            presence_data = self.realtime_database.child("presence").get()
            
            if presence_data:
                now_ms = int(time.time() * 1000)
                offline_threshold_ms = 120 * 1000  # 2 minutes
                
                for device_id, device_info in presence_data.items():
                    if not isinstance(device_info, dict): 
                        continue
                    
                    status = device_info.get("status", "offline")
                    last_seen = device_info.get("last_seen", 0)
                    
                    # Agent is offline if explicitly marked offline or stale heartbeat
                    if status == "offline" or (now_ms - last_seen > offline_threshold_ms):
                        offline_device_ids.add(device_id)

            if not offline_device_ids:
                return

            active_states = [JobState.RUNNING.value, JobState.PAUSED.value]
            docs = self.firestore_client.collection("jobs").where(filter=FieldFilter("state", "in", active_states)).get()
            
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
                    self.firestore_client.collection("jobs").document(job_id).update({
                        "state": new_state,
                        "updated_at": now_str,
                        "error_reason": error_msg,
                        "error": error_msg
                    })
                    
                    # Mark FAILED in RTDB
                    self.realtime_database.child(f"jobs/{job_id}").update({
                        "state": new_state,
                        "updated_at": now_str,
                        "error": error_msg
                    })
                    swept_count += 1
                    
            if swept_count > 0:
                print(f"[ZombieSweeper] Swept {swept_count} zombie job(s).")
                
        except Exception as e:
            print(f"[ZombieSweeper] Error during sweep: {e}")
