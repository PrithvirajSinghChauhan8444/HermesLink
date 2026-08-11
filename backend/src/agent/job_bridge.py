from datetime import datetime
from typing import Optional, Any, Dict
from models.job import JobState, Job
from firebase import (
    get_firestore_client,
    update_job_rtdb_fields,
    update_job_progress,
    get_job_rtdb_data,
)

class FirebaseJobBridge:
    """Translates engine callbacks into RTDB + Firestore writes."""

    def __init__(self) -> None:
        self.firestore_client = get_firestore_client()

    def transition_job(self, job_id: str, new_state: JobState, error_reason: Optional[str] = None) -> None:
        now = datetime.isoformat(datetime.now())
        update: Dict[str, Any] = {
            "state": new_state.value,
            "updated_at": now,
        }
        if error_reason:
            update["error"] = error_reason

        # RTDB — low latency, read by frontend
        update_job_rtdb_fields(job_id, update)

        # Firestore — keep state in sync for queries
        try:
            fs_update: Dict[str, Any] = {"state": new_state.value, "updated_at": now}
            if error_reason:
                fs_update["error"] = error_reason
            
            TERMINAL_STATES = ["COMPLETED", "FAILED", "STOPPED"]
            if new_state.value in TERMINAL_STATES:
                rtdb_data = get_job_rtdb_data(job_id)
                if rtdb_data and "progress" in rtdb_data:
                    fs_update["progress"] = rtdb_data["progress"]

            self.firestore_client.collection("jobs").document(job_id).update(fs_update)
        except Exception as e:
            print(f"[Bridge] Firestore state sync failed for {job_id}: {e}")

        print(f"[Bridge] Job {job_id} → {new_state.value}" + (f" ({error_reason})" if error_reason else ""))

    def update_progress(self, job_id: str, progress: Dict[str, Any]) -> None:
        """Called by engines to report download progress."""
        update_job_progress(job_id, progress)

    def get_job(self, job_id: str) -> Optional[Job]:
        """Check current job state from RTDB or fall back to Firestore."""
        rtdb_data = get_job_rtdb_data(job_id)
        if rtdb_data:
            return Job.from_dict(rtdb_data)
        
        doc = self.firestore_client.collection("jobs").document(job_id).get()
        if doc.exists:
            doc_dict = doc.to_dict()
            if doc_dict:
                return Job.from_dict(doc_dict)
        return None
