import json
import os
import time
from typing import Dict, List, Optional
from datetime import datetime
from .models import Job, JobState, QueueConfig, QueueState

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
        # Multi-queue state
        self.queues: Dict[str, QueueState] = {}
        self.configs: Dict[str, QueueConfig] = {}
        
        self.load_jobs()
        self._ensure_default_queue()
        self._recover_crash()

    def _ensure_default_queue(self):
        """Ensure 'default' queue exists."""
        if "default" not in self.queues:
            self.queues["default"] = QueueState(queue_id="default")
        if "default" not in self.configs:
            self.configs["default"] = QueueConfig(queue_id="default", max_parallel_jobs=1, priority=10)

    def _recover_crash(self):
        """
        Detects jobs that were left in an active state (RUNNING, PAUSED) during a previous crash
        and transitions them to FAILED or STOPPED to prevent zombie states.
        Reconciles queue state.
        """
        updates_needed = False
        
        # 1. State Recovery & Re-queueing orphan jobs
        for job_id, job in self.jobs.items():
            queue_id = job.queue_id
            if queue_id not in self.queues:
                 # Should we auto-create? Or assign to default?
                 # Let's assign to default if queue missing
                 print(f"[JobManager] Job {job_id} references missing queue {queue_id}. Moving to default.")
                 job.queue_id = "default"
                 queue_id = "default"
                 updates_needed = True

            # Consistency check: Ensure job is in its queue's list if it should be
            # Assuming COMPLETED/STOPPED/FAILED jobs are NOT in queue lists. 
            # (Wait, existing logic dequeues them. Let's keep that).
            
            if job.state == JobState.RUNNING:
                print(f"[JobManager] Detected crash/unsafe shutdown for Job {job_id}. Recovery: Marking as FAILED.")
                job.state = JobState.FAILED
                job.error_reason = "System Restarted Unexpectedly (Crash Recovery)"
                job.updated_at = datetime.isoformat(datetime.now())
                updates_needed = True
                
                # It was running, so it might be in queue list depending on our policy.
                # Usually RUNNING jobs effectively occupy a slot.
                # If we fail it, we dequeue it.
                self.dequeue(job_id)
            
            elif job.state in [JobState.PENDING, JobState.PAUSED]:
                # Ensure pending/paused jobs are in their queue list
                if job_id not in self.queues[queue_id].job_ids:
                    print(f"[JobManager] Re-queueing orphan job {job_id} to queue {queue_id}")
                    self.enqueue(job_id, queue_id)
                    updates_needed = True
            
            # Orphan check for completed/failed/stopped?
            # If they ARE in queue, remove them (cleanup)
            elif job.state in [JobState.COMPLETED, JobState.FAILED, JobState.STOPPED]:
                if job_id in self.queues[queue_id].job_ids:
                    self.dequeue(job_id)
                    updates_needed = True

        if updates_needed:
            self.save_jobs()

    def create_job(self, config: Dict, device_id: str, queue_id: str = "default") -> Job:
        """Creates a new job in PENDING state directly in the Firestore jobs collection."""
        if queue_id not in self.queues:
            if queue_id == "default":
                self._ensure_default_queue()
            else:
                 raise ValueError(f"Queue '{queue_id}' does not exist.")

        queue_cfg = self.configs.get(queue_id)
        thread_limit = queue_cfg.max_threads_per_job if queue_cfg else 4

        job = Job(
            engine_config=config, 
            device_id=device_id,
            queue_id=queue_id,
            thread_limit=thread_limit
        )
        
        # Distributed Firestore manager approach: insert directly into jobs collection
        try:
            from core.firebase_config import get_db
            db = get_db()
            db.collection('jobs').document(job.job_id).set(job.to_dict())
            print(f"[JobManager] Created job {job.job_id} directly in Firestore 'jobs' collection.")
        except Exception as e:
            print(f"[JobManager] Error creating job in Firestore: {e}")

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
        
        if new_state == current_state:
            return 

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
            job.error_reason = None
            # Invariant Check: Only ONE job currently running globally.
            active_job = self.get_active_job()
            if active_job and active_job.job_id != job_id:
                raise InvalidTransitionError(f"Cannot start job {job_id}: Job {active_job.job_id} is currently RUNNING.")

        self.save_jobs()

        # Handle Queue Logic post-transition
        if new_state in [JobState.COMPLETED, JobState.FAILED, JobState.STOPPED]:
            self.dequeue(job_id)
            self.process_queues()
        elif new_state == JobState.RUNNING:
            # Ensure it is in queue if not already
            if job_id not in self.queues[job.queue_id].job_ids:
                 self.enqueue(job_id, job.queue_id)

    def update_progress(self, job_id: str, progress_data: Dict):
        job = self.jobs.get(job_id)
        if job:
            job.progress = progress_data
            job.updated_at = datetime.isoformat(datetime.now())
            self.save_jobs()

    def save_jobs(self):
        """Persist all jobs, queues, and configs to Firestore."""
        try:
            from core.firebase_config import get_db
            from firebase_admin import firestore
            db = get_db()
            
            # Using a single document for the admin state to keep logic simple
            # and matching the original local JSON save structure.
            admin_doc_ref = db.collection('app_state').document('admin_data')
            
            data = {
                "jobs": {jid: job.to_dict() for jid, job in self.jobs.items()},
                "queues": {qid: q.to_dict() for qid, q in self.queues.items()},
                "configs": {cid: c.to_dict() for cid, c in self.configs.items()},
                "updated_at": firestore.SERVER_TIMESTAMP
            }
            
            admin_doc_ref.set(data)
        except Exception as e:
            print(f"[JobManager] Error saving jobs to Firestore: {e}")

    def load_jobs(self):
        """Load jobs and queue from Firestore."""
        try:
            from core.firebase_config import get_db
            db = get_db()
            
            admin_doc_ref = db.collection('app_state').document('admin_data')
            doc = admin_doc_ref.get()
            
            if not doc.exists:
                print("[JobManager] No existing Firestore state found. Starting fresh.")
                return

            data = doc.to_dict()
            
            new_jobs = {}
            self.queues = {}
            self.configs = {}

            if "queues" in data:
                raw_jobs = data.get("jobs", {})
                raw_queues = data.get("queues", {})
                raw_configs = data.get("configs", {})
                
                for qid, qdata in raw_queues.items():
                    self.queues[qid] = QueueState.from_dict(qdata)
                for cid, cdata in raw_configs.items():
                    self.configs[cid] = QueueConfig.from_dict(cdata)
            
            else:
                raw_jobs = data.get("jobs", data)
                self.queues["default"] = QueueState(queue_id="default", job_ids=[])
                self.configs["default"] = QueueConfig(queue_id="default")
            
            for job_id, job_data in raw_jobs.items():
                job = Job.from_dict(job_data)
                if not job.queue_id or job.queue_id not in self.queues:
                    job.queue_id = "default" 
                new_jobs[job_id] = job
            
            self.jobs = new_jobs

        except Exception as e:
            print(f"[JobManager] Error loading jobs from Firestore (keeping cached state): {e}")

    # --- Queue Operations ---

    def create_queue(self, queue_id: str, config: Optional[Dict] = None):
        """Creates a new queue."""
        if queue_id in self.queues:
            raise ValueError(f"Queue {queue_id} already exists.")
        
        self.queues[queue_id] = QueueState(queue_id=queue_id)
        
        # Parse config or defaults
        if config:
            # Merge with defaults logic manually or clean this up
            self.configs[queue_id] = QueueConfig(queue_id=queue_id, **config)
        else:
            self.configs[queue_id] = QueueConfig(queue_id=queue_id)
        
        self.save_jobs()

    def delete_queue(self, queue_id: str, force: bool = False):
        """Deletes a queue."""
        if queue_id == "default":
             raise ValueError("Cannot delete 'default' queue.")
        
        if queue_id not in self.queues:
            raise ValueError(f"Queue {queue_id} not found.")

        # Check for running jobs
        queue_state = self.queues[queue_id]
        has_active_jobs = any(
            self.jobs[jid].state == JobState.RUNNING 
            for jid in queue_state.job_ids 
            if jid in self.jobs
        )
        
        if has_active_jobs and not force:
            raise ValueError(f"Queue {queue_id} has running jobs. Stop them or use force=True.")

        # Move remaining jobs to default or stop? 
        # Plan says: "Either reassign jobs to default Or stop all jobs"
        # Let's reassign PENDING/PAUSED to default.
        for jid in list(queue_state.job_ids):
            if jid in self.jobs:
                job = self.jobs[jid]
                if job.state == JobState.RUNNING and force:
                     self.stop_job(jid) # This will dequeue it
                
                # Check again if still exists (stop might have removed it?)
                # Actually stop_job dequeues but job object remains.
                if jid in self.jobs: 
                    job = self.jobs[jid]
                    job.queue_id = "default"
                    self.enqueue(jid, "default")
        
        del self.queues[queue_id]
        del self.configs[queue_id]
        self.save_jobs()

    def enqueue(self, job_id: str, queue_id: str = "default"):
        """Add job to the end of the specified queue if not already present."""
        if queue_id not in self.queues:
            raise ValueError(f"Queue {queue_id} does not exist.")
            
        q_state = self.queues[queue_id]
        if job_id not in q_state.job_ids:
            q_state.job_ids.append(job_id)

    def dequeue(self, job_id: str):
        """Remove job from its queue."""
        # We might not know which queue it is effectively if we just have ID.
        # But job has .queue_id.
        job = self.jobs.get(job_id)
        if job and job.queue_id in self.queues:
            q_state = self.queues[job.queue_id]
            if job_id in q_state.job_ids:
                q_state.job_ids.remove(job_id)
        else:
            # Fallback scan all queues (consistency)
            for q in self.queues.values():
                if job_id in q.job_ids:
                    q.job_ids.remove(job_id)

    def get_active_job(self) -> Optional[Job]:
        """Returns the job currently in RUNNING state (if any)."""
        # Global scan
        for job in self.jobs.values():
            if job.state == JobState.RUNNING:
                return job
        return None

    def process_queues(self):
        """
        Main Scheduler Loop.
        Attempt to start jobs based on priority and constraints.
        Enforces Global Single Active Job rule.
        """
        # 1. Global Invariant: If ANY job is running, stop.
        if self.get_active_job():
            return

        # 2. Iterate Queues by Priority (High -> Low)
        sorted_queues = sorted(
            self.configs.values(), 
            key=lambda c: c.priority, 
            reverse=True
        )

        for config in sorted_queues:
            if not config.enabled:
                continue
            
            queue_id = config.queue_id
            if queue_id not in self.queues:
                continue
            
            # Queue constraints (active jobs in THIS queue)
            # Find running jobs in this queue
            # (Currently redundant since Global Limit is 1, but future proof)
            queue_running_count = sum(
                1 for jid in self.queues[queue_id].job_ids 
                if self.jobs.get(jid) and self.jobs[jid].state == JobState.RUNNING
            )
            
            if queue_running_count >= config.max_parallel_jobs:
                continue

            # 3. Find next PENDING job in this queue
            candidate_job_id = None
            for jid in self.queues[queue_id].job_ids:
                job = self.jobs.get(jid)
                if job and job.state == JobState.PENDING:
                    candidate_job_id = jid
                    break
            
            if candidate_job_id:
                print(f"[JobManager] Scheduler: Starting Job {candidate_job_id} from Queue '{queue_id}'")
                try:
                    self.transition_job(candidate_job_id, JobState.RUNNING)
                    # GLOBAL SINGLE JOB LIMIT REACHED -> BREAK
                    return 
                except Exception as e:
                    print(f"[JobManager] Failed to start job {candidate_job_id}: {e}")
                    # Mark failed? Or retry next loop?
                    # If we don't fail it, we loop forever.
                    # Let's transition to FAILED.
                    try:
                        self.transition_job(candidate_job_id, JobState.FAILED, error_reason=str(e))
                    except:
                        pass
                    # Continue to try next job/queue?
                    # Recurse or just let next call handle it?
                    # process_queues called on transition, so we are good.
                    return

    # --- Control Methods (Dashboard/API) ---

    def pause_job(self, job_id: str):
        """Pauses a running job."""
        print(f"[JobManager] Request to PAUSE job {job_id}")
        self.transition_job(job_id, JobState.PAUSED)
        # TODO: Call self.engine.pause(job_id)

    def resume_job(self, job_id: str):
        """Resumes a paused job."""
        print(f"[JobManager] Request to RESUME job {job_id}")
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
        self.transition_job(job_id, JobState.RUNNING)
        # TODO: Call self.engine.start_download(job_id, ...)

    def restart_job(self, job_id: str):
        """Restarts a job from scratch."""
        print(f"[JobManager] Request to RESTART job {job_id}")
        job = self.jobs.get(job_id)
        if job:
            job.progress = {} # Clear progress
            pass
            
        self.transition_job(job_id, JobState.RUNNING)
        # TODO: Call self.engine.start_download(job_id, ...)

    def stop_all_jobs(self):
        """Stops all PENDING, RUNNING, or PAUSED jobs."""
        print("[JobManager] Initiating KILL SWITCH: Stopping ALL jobs.")
        for job_id, job in list(self.jobs.items()):
            if job.state in [JobState.PENDING, JobState.RUNNING, JobState.PAUSED]:
                try:
                    self.stop_job(job_id)
                except Exception as e:
                    print(f"[JobManager] Error stopping job {job_id}: {e}")
        
        # Clear all queues?
        for q in self.queues.values():
            q.job_ids.clear()
        self.save_jobs()


