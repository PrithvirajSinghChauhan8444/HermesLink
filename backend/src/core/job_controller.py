from typing import Dict, List, Optional
from .job_manager import JobManager
from .models import Job, JobState

class JobController:
    """
    Command Dispatcher Layer for Dashboard Control.
    Validates state transitions and routes commands to JobManager.
    """
    
    # State-Based Permission Table
    # Format: Current State -> Set of Allowed Actions
    ALLOWED_ACTIONS = {
        JobState.PENDING: {"STOP"},
        JobState.RUNNING: {"PAUSE", "STOP"},
        JobState.PAUSED: {"RESUME", "STOP"},
        JobState.FAILED: {"RETRY", "RESTART", "STOP"},
        JobState.COMPLETED: set(), # No actions allowed
        JobState.STOPPED: set(),   # No actions allowed
    }

    def __init__(self, job_manager: JobManager):
        self.job_manager = job_manager

    def handle_command(self, job_id: str, action: str) -> Dict[str, str]:
        """
        Main entry point for dashboard commands.
        
        Args:
            job_id: The ID of the job to control.
            action: One of "PAUSE", "RESUME", "STOP", "RETRY", "RESTART".
            
        Returns:
            Dict with "status" ("success" or "error") and "message".
        """
        action = action.upper()
        
        job = self.job_manager.get_job(job_id)
        if not job:
            return {"status": "error", "message": f"Job {job_id} not found"}

        # Validate Action
        allowed = self.ALLOWED_ACTIONS.get(job.state, set())
        if action not in allowed:
            return {
                "status": "error", 
                "message": f"Action '{action}' not allowed for job {job_id} in state {job.state}. Allowed: {list(allowed)}"
            }

        # Dispatch
        try:
            if action == "PAUSE":
                self.job_manager.pause_job(job_id)
            elif action == "RESUME":
                self.job_manager.resume_job(job_id)
            elif action == "STOP":
                self.job_manager.stop_job(job_id)
            elif action == "RETRY":
                self.job_manager.retry_job(job_id)
            elif action == "RESTART":
                self.job_manager.restart_job(job_id)
            else:
                 return {"status": "error", "message": f"Unknown action: {action}"}
            
            return {"status": "success", "message": f"Command '{action}' executed for job {job_id}"}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Returns details for a specific job."""
        job = self.job_manager.get_job(job_id)
        if job:
            return job.to_dict()
        return None

    def get_all_jobs_status(self) -> List[Dict]:
        """Returns status summary for all jobs."""
        jobs = self.job_manager.list_jobs()
        # Ensure we return a consistent summary structure
        return [job.to_dict() for job in jobs]
