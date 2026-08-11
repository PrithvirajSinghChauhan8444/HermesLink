import json
import os
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
from models import Job, JobState, QueueConfig, QueueState
from core.queue_manager import QueueManager
from core.scheduler import Scheduler

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
        
        # Instantiate managers
        self.queue_manager = QueueManager(self)
        self.scheduler = Scheduler(self)
        
        self.load_jobs()
        self.queue_manager.ensure_default_queue()
        self._recover_crash()

    @property
    def queues(self):
        return self.queue_manager.queues

    @queues.setter
    def queues(self, val):
        self.queue_manager.queues = val

    @property
    def configs(self):
        return self.queue_manager.configs

    @configs.setter
    def configs(self, val):
        self.queue_manager.configs = val

    def create_queue(self, queue_id: str, config: Optional[Dict[str, Any]] = None) -> None:
        self.queue_manager.create_queue(queue_id, config)

    def delete_queue(self, queue_id: str, force: bool = False) -> None:
        self.queue_manager.delete_queue(queue_id, force)

    def enqueue(self, job_id: str, queue_id: str = "default") -> None:
        self.queue_manager.enqueue(job_id, queue_id)

    def dequeue(self, job_id: str) -> None:
        self.queue_manager.dequeue(job_id)

    def get_active_job(self) -> Optional[Job]:
        return self.scheduler.get_active_job()

    def process_queues(self) -> None:
        self.scheduler.process_queues()

    def _recover_crash(self) -> None:
        """
        Detects jobs that were left in an active state (RUNNING, PAUSED) during a previous crash
        and transitions them to FAILED or STOPPED to prevent zombie states.
        Reconciles queue state.
        """
        updates_needed = False
        
        for job_id, job in self.jobs.items():
            queue_id = job.queue_id
            if queue_id not in self.queues:
                 print(f"[JobManager] Job {job_id} references missing queue {queue_id}. Moving to default.")
                 job.queue_id = "default"
                 queue_id = "default"
                 updates_needed = True

            if job.state == JobState.RUNNING:
                 print(f"[JobManager] Detected crash/unsafe shutdown for Job {job_id}. Recovery: Marking as PENDING to auto-resume.")
                 job.state = JobState.PENDING
                 job.error_reason = "System Restarted Unexpectedly (Crash Recovery)"
                 job.updated_at = datetime.isoformat(datetime.now())
                 updates_needed = True
                 
                 if job_id not in self.queues[queue_id].job_ids:
                     self.enqueue(job_id, queue_id)
            
            elif job.state in [JobState.PENDING, JobState.PAUSED]:
                 if job_id not in self.queues[queue_id].job_ids:
                     print(f"[JobManager] Re-queueing orphan job {job_id} to queue {queue_id}")
                     self.enqueue(job_id, queue_id)
                     updates_needed = True
            
            elif job.state in [JobState.COMPLETED, JobState.FAILED, JobState.STOPPED]:
                 if job_id in self.queues[queue_id].job_ids:
                     self.dequeue(job_id)
                     updates_needed = True

        if updates_needed:
            self.save_jobs()

    def create_job(self, config: Dict[str, Any], device_id: str, queue_id: str = "default") -> Job:
        """Creates a new job in PENDING state directly in the Firestore jobs collection."""
        if queue_id == "auto":
            url = config.get("url", "").lower()
            if "youtube.com" in url or "youtu.be" in url:
                queue_id = "media" if "media" in self.queues else "default"
            else:
                queue_id = "default"

        if queue_id not in self.queues:
            if queue_id == "default":
                self.queue_manager.ensure_default_queue()
            else:
                 raise ValueError(f"Queue '{queue_id}' does not exist.")

        queue_config = self.configs.get(queue_id)
        thread_limit = queue_config.max_threads_per_job if queue_config else 4

        job = Job(
            engine_config=config, 
            device_id=device_id,
            queue_id=queue_id,
            thread_limit=thread_limit
        )
        
        try:
            from firebase import get_firestore_client
            firestore_client = get_firestore_client()
            firestore_client.collection('jobs').document(job.job_id).set(job.to_dict())
            print(f"[JobManager] Created job {job.job_id} directly in Firestore 'jobs' collection.")
        except Exception as e:
            print(f"[JobManager] Error creating job in Firestore: {e}")

        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    def list_jobs(self) -> List[Job]:
        return list(self.jobs.values())

    def transition_job(self, job_id: str, new_state: JobState, error_reason: Optional[str] = None) -> None:
        """
        Transitions a job to a new state if allowed.
        Updates timestamps and persists changes.
        """
        job = self.jobs.get(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        current_state = job.state
        
        if new_state == current_state:
            return 

        allowed = self.ALLOWED_TRANSITIONS.get(current_state, set())
        
        if new_state not in allowed:
            raise InvalidTransitionError(
                f"Cannot transition job {job_id} from {current_state} to {new_state}. "
                f"Allowed: {allowed}"
            )

        job.state = new_state
        job.updated_at = datetime.isoformat(datetime.now())
        
        if new_state == JobState.FAILED:
            job.error_reason = error_reason
        elif new_state == JobState.RUNNING:
            job.error_reason = None
            active_job = self.get_active_job()
            if active_job and active_job.job_id != job_id:
                raise InvalidTransitionError(f"Cannot start job {job_id}: Job {active_job.job_id} is currently RUNNING.")

        self.save_jobs()

        if new_state in [JobState.COMPLETED, JobState.FAILED, JobState.STOPPED]:
            self.dequeue(job_id)
            self.process_queues()
        elif new_state == JobState.RUNNING:
            if job_id not in self.queues[job.queue_id].job_ids:
                 self.enqueue(job_id, job.queue_id)

    def update_progress(self, job_id: str, progress_data: Dict[str, Any]) -> None:
        job = self.jobs.get(job_id)
        if job:
            job.progress = progress_data
            job.updated_at = datetime.isoformat(datetime.now())
            self.save_jobs()

    def save_jobs(self) -> None:
        """Persist all jobs, queues, and configs to Firestore."""
        try:
            from firebase import get_firestore_client
            from firebase_admin import firestore
            firestore_client = get_firestore_client()
            
            admin_doc_ref = firestore_client.collection('app_state').document('admin_data')
            
            data = {
                "jobs": {job_id: job.to_dict() for job_id, job in self.jobs.items()},
                "queues": {queue_id: queue.to_dict() for queue_id, queue in self.queues.items()},
                "configs": {config_id: config.to_dict() for config_id, config in self.configs.items()},
                "updated_at": firestore.SERVER_TIMESTAMP
            }
            
            admin_doc_ref.set(data)
        except Exception as e:
            print(f"[JobManager] Error saving jobs to Firestore: {e}")

    def load_jobs(self) -> None:
        """Load jobs and queue from Firestore."""
        try:
            from firebase import get_firestore_client
            firestore_client = get_firestore_client()
            
            admin_doc_ref = firestore_client.collection('app_state').document('admin_data')
            doc = admin_doc_ref.get()
            
            if not doc.exists:
                print("[JobManager] No existing Firestore state found. Starting fresh.")
                return

            data = doc.to_dict()
            if not data:
                return
            
            new_jobs = {}
            self.queues = {}
            self.configs = {}

            if "queues" in data:
                raw_jobs = data.get("jobs", {})
                raw_queues = data.get("queues", {})
                raw_configs = data.get("configs", {})
                
                for queue_id, queue_data in raw_queues.items():
                    self.queues[queue_id] = QueueState.from_dict(queue_data)
                for config_id, config_data in raw_configs.items():
                    self.configs[config_id] = QueueConfig.from_dict(config_data)
            
            else:
                raw_jobs = data.get("jobs", data)
                self.queues["default"] = QueueState(queue_id="default", job_ids=[])
                self.configs["default"] = QueueConfig(queue_id="default")
            
            for job_id, job_data in raw_jobs.items():
                if not isinstance(job_data, dict):
                    continue
                job = Job.from_dict(job_data)
                if not job.queue_id or job.queue_id not in self.queues:
                    job.queue_id = "default" 
                new_jobs[job_id] = job
            
            self.jobs = new_jobs

        except Exception as e:
            print(f"[JobManager] Error loading jobs from Firestore (keeping cached state): {e}")

    def pause_job(self, job_id: str) -> None:
        """Pauses a running job."""
        print(f"[JobManager] Request to PAUSE job {job_id}")
        self.transition_job(job_id, JobState.PAUSED)

    def resume_job(self, job_id: str) -> None:
        """Resumes a paused job."""
        print(f"[JobManager] Request to RESUME job {job_id}")
        self.transition_job(job_id, JobState.RUNNING)

    def stop_job(self, job_id: str) -> None:
        """Stops a job (forcefully)."""
        print(f"[JobManager] Request to STOP job {job_id}")
        self.transition_job(job_id, JobState.STOPPED)

    def retry_job(self, job_id: str) -> None:
        """Retries a FAILED job."""
        print(f"[JobManager] Request to RETRY job {job_id}")
        self.transition_job(job_id, JobState.RUNNING)

    def restart_job(self, job_id: str) -> None:
        """Restarts a job from scratch."""
        print(f"[JobManager] Request to RESTART job {job_id}")
        job = self.jobs.get(job_id)
        if job:
            job.progress = {}
            
        self.transition_job(job_id, JobState.RUNNING)

    def stop_all_jobs(self) -> None:
        """Stops all PENDING, RUNNING, or PAUSED jobs."""
        print("[JobManager] Initiating KILL SWITCH: Stopping ALL jobs.")
        for job_id, job in list(self.jobs.items()):
            if job.state in [JobState.PENDING, JobState.RUNNING, JobState.PAUSED]:
                try:
                    self.stop_job(job_id)
                except Exception as e:
                    print(f"[JobManager] Error stopping job {job_id}: {e}")
        
        for queue in self.queues.values():
            queue.job_ids.clear()
        self.save_jobs()
