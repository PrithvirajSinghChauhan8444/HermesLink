import json
import os
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
        """Persist all jobs to disk."""
        data = {original_id: job.to_dict() for original_id, job in self.jobs.items()}
        with open(self.persistence_file, 'w') as f:
            json.dump(data, f, indent=2)

    def load_jobs(self):
        """Load jobs from disk."""
        if not os.path.exists(self.persistence_file):
            return

        try:
            with open(self.persistence_file, 'r') as f:
                data = json.load(f)
                for job_id, job_data in data.items():
                    self.jobs[job_id] = Job.from_dict(job_data)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading jobs: {e}")
            # Decision: Start fresh or backup? For now, just start fresh if corrupt.
            self.jobs = {}
