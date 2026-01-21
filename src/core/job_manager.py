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
        self.queue: List[str] = []  # Ordered list of job_ids
        self.load_jobs()
        self._recover_crash()

    def _recover_crash(self):
        """
        Detects jobs that were left in an active state (RUNNING, PAUSED) during a previous crash
        and transitions them to FAILED or STOPPED to prevent zombie states.
        Reconciles queue state.
        """
        updates_needed = False
        active_job_found = False

        # 1. State Recovery
        for job_id, job in self.jobs.items():
            if job.state in [JobState.RUNNING]:
                print(f"[JobManager] Detected crash/unsafe shutdown for Job {job_id}. Recovery: Marking as FAILED.")
                job.state = JobState.FAILED
                job.error_reason = "System Restarted Unexpectedly (Crash Recovery)"
                job.updated_at = datetime.isoformat(datetime.now())
                updates_needed = True
                # Remove from queue if it was there
                if job_id in self.queue:
                    self.queue.remove(job_id)
            
            # PAUSED jobs are valid to remain PAUSED and in queue
            elif job.state == JobState.PAUSED:
                if job_id not in self.queue:
                    print(f"[JobManager] Re-queueing orphan PAUSED job {job_id}")
                    self.enqueue(job_id) # Add to end if missing
                    updates_needed = True

        # 2. Reconcile Queue with PENDING jobs
        for job_id, job in self.jobs.items():
            if job.state == JobState.PENDING and job_id not in self.queue:
                print(f"[JobManager] Re-queueing orphan PENDING job {job_id}")
                self.enqueue(job_id)
                updates_needed = True

        if updates_needed:
            self.save_jobs()

    def create_job(self, config: Dict) -> Job:
        """Creates a new job in PENDING state and enqueues it."""
        job = Job(engine_config=config)
        self.jobs[job.job_id] = job
        self.enqueue(job.job_id)
        self.save_jobs()
        self.advance_queue() # Try to start if idle
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
            # If manually starting (e.g. retry), ensure it's in queue context or we might need to verify single active?
            # For now, let's assume if it transitions to RUNNING, it becomes the active job.
            # But the Rule says "At most ONE job can be RUNNING".
            active_job = self.get_active_job()
            if active_job and active_job.job_id != job_id:
                # If we are here, we are violating the rule unless we stop the other one.
                # But transition_job shouldn't implicitly stop others.
                # However, advance_queue handles this.
                # If user forces, we might just warn or error? 
                # Let's enforce strictly check.
                raise InvalidTransitionError(f"Cannot start job {job_id}: Job {active_job.job_id} is currently RUNNING.")

        self.save_jobs()

        # Handle Queue Logic post-transition
        if new_state in [JobState.COMPLETED, JobState.FAILED, JobState.STOPPED]:
            self.dequeue(job_id)
            self.advance_queue()
        elif new_state == JobState.RUNNING:
            # Ensure it is in queue (if it was FAILED/STOPPED and manually restarted)
            # If it's already in queue (e.g. from PENDING), this is a no-op order-wise
            if job_id not in self.queue:
                 # If manually restarted, add to front or back? 
                 # Usually restarts go to end, or stay in place?
                 # If it wasn't in queue, we add it. 
                 # If it is running, it effectively holds a slot.
                 self.enqueue(job_id)
            pass

    def update_progress(self, job_id: str, progress_data: Dict):
        job = self.jobs.get(job_id)
        if job:
            job.progress = progress_data
            job.updated_at = datetime.isoformat(datetime.now())
            self.save_jobs()

    def save_jobs(self):
        """Persist all jobs and queue to disk using atomic write."""
        # Save both jobs and current queue order
        data = {
            "jobs": {original_id: job.to_dict() for original_id, job in self.jobs.items()},
            "queue": self.queue
        }
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
        """Load jobs and queue from disk."""
        if not os.path.exists(self.persistence_file):
            return

        try:
            with open(self.persistence_file, 'r') as f:
                data = json.load(f)
                
                new_jobs = {}
                new_queue = []

                # Handle Migration: Check if root is dict of jobs (Old) or dict with 'jobs' key (New)
                # Old format: {"job_id": {...}, ...} - assuming job keys don't match "jobs" key which is safe
                if "jobs" in data and isinstance(data["jobs"], dict):
                    # New Format
                    raw_jobs = data["jobs"]
                    new_queue = data.get("queue", [])
                else:
                    # Old Format
                    raw_jobs = data
                    # Queue recovery for old format?
                    # Maybe just order by created_at or PENDING ones?
                    # Leave empty and let _recover_crash populate PENDING ones.
                    new_queue = []

                for job_id, job_data in raw_jobs.items():
                    new_jobs[job_id] = Job.from_dict(job_data)
                
                self.jobs = new_jobs
                self.queue = new_queue # Logic updates queue in recover_crash if needed

        except (json.JSONDecodeError, IOError) as e:
            print(f"[JobManager] Error loading jobs (keeping cached state): {e}")
            # Do not clear self.jobs on error to prevent dashboard flickering
            pass

    # --- Queue Operations ---

    def enqueue(self, job_id: str):
        """Add job to the end of the queue if not already present."""
        if job_id not in self.queue:
            self.queue.append(job_id)
            # We don't save here automatically to avoid excessive writes, 
            # usually caller calls save_jobs or we do it in high level ops

    def dequeue(self, job_id: str):
        """Remove job from the queue."""
        if job_id in self.queue:
            self.queue.remove(job_id)

    def peek_next(self) -> Optional[str]:
        """Return the next PENDING job_id in the queue."""
        for job_id in self.queue:
            job = self.jobs.get(job_id)
            if job and job.state == JobState.PENDING:
                return job_id
        return None

    def get_active_job(self) -> Optional[Job]:
        """Returns the job currently in RUNNING state (if any)."""
        # We iterate list to be safe, or we could track active_job separately.
        # Iteration is safe for small job counts.
        for job in self.jobs.values():
            if job.state == JobState.RUNNING:
                return job
        return None

    def advance_queue(self):
        """
        Attempt to start the next jobs in the queue.
        Enforces Single Active Job rule.
        """
        # 1. Check if any job is RUNNING
        active = self.get_active_job()
        if active:
            # Busy, do nothing
            return

        # 2. Find next PENDING job
        next_job_id = self.peek_next()
        if not next_job_id:
            # Nothing to run
            return

        # 3. Start it
        print(f"[JobManager] Auto-advancing queue. Starting Job {next_job_id}")
        try:
            # We bypass the "check active" in transition_job because we just checked it.
            # But the check inside transition_job is good safety.
            self.transition_job(next_job_id, JobState.RUNNING)
        except Exception as e:
            print(f"[JobManager] Failed to auto-start job {next_job_id}: {e}")
            # If it fails to start, maybe mark it FAILED so we don't get stuck?
            # For now, just log.
            pass

    # --- Control Methods (Dashboard/API) ---

    def pause_job(self, job_id: str):
        """Pauses a running job."""
        print(f"[JobManager] Request to PAUSE job {job_id}")
        self.transition_job(job_id, JobState.PAUSED)
        # TODO: Call self.engine.pause(job_id)

    def resume_job(self, job_id: str):
        """Resumes a paused job."""
        print(f"[JobManager] Request to RESUME job {job_id}")
        # Transition to RUNNING. 
        # Note: transition_job ensures Single Active Job rule is respected if integrated with `get_active_job` checks.
        self.transition_job(job_id, JobState.RUNNING)
        # TODO: Call self.engine.resume(job_id)

    def stop_job(self, job_id: str):
        """Stops a job (forcefully)."""
        print(f"[JobManager] Request to STOP job {job_id}")
        self.transition_job(job_id, JobState.STOPPED)
        # TODO: Call self.engine.stop(job_id)

    def retry_job(self, job_id: str):
        """Retries a FAILED job."""
        print(f"[JobManager] Request to RETRY job {job_id}")
        # Retry usually means "try again from where it left off" or "restart"?
        # For aria2, if .aria2 file exists, it resumes.
        self.transition_job(job_id, JobState.RUNNING)
        # TODO: Call self.engine.start_download(job_id, ...)

    def restart_job(self, job_id: str):
        """Restarts a job from scratch."""
        print(f"[JobManager] Request to RESTART job {job_id}")
        # Logic to clear progress?
        job = self.jobs.get(job_id)
        if job:
            job.progress = {} # Clear progress
            # Maybe clean up files on disk too?
            pass
            
        self.transition_job(job_id, JobState.RUNNING)
        # TODO: Call self.engine.start_download(job_id, ...)
