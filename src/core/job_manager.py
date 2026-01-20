import json
import os
import time
from typing import Dict, List, Optional
from datetime import datetime
from .models import Job, JobState

class InvalidTransitionError(Exception):
    """Raised when a state transition is not allowed."""
    pass

class JobManager:
    JOBS_FILE = "jobs.json"
    
    ALLOWED_TRANSITIONS = {
        JobState.PENDING: {JobState.RUNNING, JobState.STOPPED},
        JobState.RUNNING: {JobState.PAUSED, JobState.FAILED, JobState.COMPLETED, JobState.STOPPED},
        JobState.PAUSED: {JobState.RUNNING, JobState.STOPPED},
        JobState.FAILED: {JobState.RUNNING, JobState.STOPPED}, # RUNNING implies retry/restart
        JobState.COMPLETED: set(),
        JobState.STOPPED: set(),
    }

    def __init__(self, persistence_file: str = "jobs.json"):
        self.persistence_file = persistence_file
        self.jobs: Dict[str, Job] = {}
        self.load_jobs()
        self._recover_crash()

    def _recover_crash(self):
        """
        Detects jobs that were left in an active state (RUNNING, PAUSED) during a previous crash
        and transitions them to FAILED or STOPPED to prevent zombie states.
        """
        updates_needed = False
        for job_id, job in self.jobs.items():
            if job.state in [JobState.RUNNING]:
                print(f"[JobManager] Detected crash/unsafe shutdown for Job {job_id}. Recovery: Marking as FAILED.")
                job.state = JobState.FAILED
                job.error_reason = "System Restarted Unexpectedly (Crash Recovery)"
                job.updated_at = datetime.isoformat(datetime.now())
                updates_needed = True
            # Optional: Move PAUSED to STOPPED or keep PAUSED?
            # Keeping PAUSED is potentially safe, but let's be strict for now.
            
        if updates_needed:
            self.save_jobs()

    def create_job(self, config: Dict) -> Job:
        """Creates a new job in PENDING state."""
        job = Job(engine_config=config)
        self.jobs[job.job_id] = job
        self.save_jobs()
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    def list_jobs(self) -> List[Job]:
        return list(self.jobs.values())

    def transition_job(self, job_id: str, new_state: JobState, error_reason: Optional[str] = None):
        """
        Transitions a job to a new state if allowed.
        Updates timestamps and persists changes.
        """
        job = self.jobs.get(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        current_state = job.state
        
        # Self-transition is technically valid or no-op, but let's check strict transitions
        if new_state == current_state:
            return # No change needed

        allowed = self.ALLOWED_TRANSITIONS.get(current_state, set())
        
        if new_state not in allowed:
            raise InvalidTransitionError(
                f"Cannot transition job {job_id} from {current_state} to {new_state}. "
                f"Allowed: {allowed}"
            )

        # Apply State
        job.state = new_state
        job.updated_at = datetime.isoformat(datetime.now())
        
        if new_state == JobState.FAILED:
            job.error_reason = error_reason
        elif new_state == JobState.RUNNING:
            # Clear previous error on retry/start
            job.error_reason = None

        self.save_jobs()

    def update_progress(self, job_id: str, progress_data: Dict):
        job = self.jobs.get(job_id)
        if job:
            job.progress = progress_data
            job.updated_at = datetime.isoformat(datetime.now())
            self.save_jobs()

    def save_jobs(self):
        """Persist all jobs to disk using atomic write."""
        data = {original_id: job.to_dict() for original_id, job in self.jobs.items()}
        temp_file = self.persistence_file + ".tmp"
        try:
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Retry loop for atomic rename (Windows lock handling)
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    os.replace(temp_file, self.persistence_file)
                    break
                except PermissionError:
                    if attempt < max_retries - 1:
                        time.sleep(0.1)
                    else:
                        raise
                        
        except Exception as e:
            print(f"[JobManager] Error saving jobs: {e}")
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except OSError:
                    pass

    def load_jobs(self):
        """Load jobs from disk."""
        if not os.path.exists(self.persistence_file):
            return

        try:
            with open(self.persistence_file, 'r') as f:
                data = json.load(f)
                new_jobs = {}
                for job_id, job_data in data.items():
                    new_jobs[job_id] = Job.from_dict(job_data)
                self.jobs = new_jobs # Only update if successful
        except (json.JSONDecodeError, IOError) as e:
            print(f"[JobManager] Error loading jobs (keeping cached state): {e}")
            # Do not clear self.jobs on error to prevent dashboard flickering
            pass
