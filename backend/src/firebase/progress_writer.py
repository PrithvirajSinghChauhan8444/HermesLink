from typing import Any, Dict, Optional
from .firebase_client import get_realtime_database_reference

def _get_job_ref(job_id: str) -> Any:
    return get_realtime_database_reference().child(f"jobs/{job_id}")

def update_job_progress(job_id: str, progress_data: Dict[str, Any]) -> None:
    """Updates only the progress sub-dictionary of a job in Realtime Database."""
    _get_job_ref(job_id).update({"progress": progress_data})

def update_job_rtdb_fields(job_id: str, fields: Dict[str, Any]) -> None:
    """Updates selected top-level attributes of a job in Realtime Database."""
    _get_job_ref(job_id).update(fields)

def get_job_rtdb_data(job_id: str) -> Optional[Dict[str, Any]]:
    """Gets job data stored in Realtime Database."""
    return _get_job_ref(job_id).get()

def get_job_action_ref(job_id: str) -> Any:
    """Returns the database reference path for listening to manual control actions."""
    return _get_job_ref(job_id).child("action")

def delete_job_action(job_id: str) -> None:
    """Deletes the action node of a job to prevent repeated triggers."""
    _get_job_ref(job_id).child("action").delete()
