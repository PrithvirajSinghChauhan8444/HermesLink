from typing import Dict, Any, Optional
from models import QueueConfig, QueueState, JobState

class QueueManager:
    def __init__(self, job_manager):
        self.job_manager = job_manager
        self.queues: Dict[str, QueueState] = {}
        self.configs: Dict[str, QueueConfig] = {}

    def ensure_default_queue(self) -> None:
        """Ensure 'default' queue exists."""
        if "default" not in self.queues:
            self.queues["default"] = QueueState(queue_id="default")
        if "default" not in self.configs:
            self.configs["default"] = QueueConfig(queue_id="default", max_parallel_jobs=1, priority=10)

    def create_queue(self, queue_id: str, config: Optional[Dict[str, Any]] = None) -> None:
        """Creates a new queue."""
        if queue_id in self.queues:
            raise ValueError(f"Queue {queue_id} already exists.")
        
        self.queues[queue_id] = QueueState(queue_id=queue_id)
        
        if config:
            self.configs[queue_id] = QueueConfig(queue_id=queue_id, **config)
        else:
            self.configs[queue_id] = QueueConfig(queue_id=queue_id)
        
        self.job_manager.save_jobs()

    def delete_queue(self, queue_id: str, force: bool = False) -> None:
        """Deletes a queue."""
        if queue_id == "default":
             raise ValueError("Cannot delete 'default' queue.")
        
        if queue_id not in self.queues:
            raise ValueError(f"Queue {queue_id} not found.")

        queue_state = self.queues[queue_id]
        has_active_jobs = any(
            self.job_manager.jobs[jid].state == JobState.RUNNING 
            for jid in queue_state.job_ids 
            if jid in self.job_manager.jobs
        )
        
        if has_active_jobs and not force:
            raise ValueError(f"Queue {queue_id} has running jobs. Stop them or use force=True.")

        for jid in list(queue_state.job_ids):
            if jid in self.job_manager.jobs:
                job = self.job_manager.jobs[jid]
                if job.state == JobState.RUNNING and force:
                     self.job_manager.stop_job(jid)
                
                if jid in self.job_manager.jobs: 
                    job = self.job_manager.jobs[jid]
                    job.queue_id = "default"
                    self.enqueue(jid, "default")
        
        if queue_id in self.queues:
            del self.queues[queue_id]
        if queue_id in self.configs:
            del self.configs[queue_id]
        self.job_manager.save_jobs()

    def enqueue(self, job_id: str, queue_id: str = "default") -> None:
        """Add job to the end of the specified queue if not already present."""
        if queue_id not in self.queues:
            raise ValueError(f"Queue {queue_id} does not exist.")
            
        q_state = self.queues[queue_id]
        if job_id not in q_state.job_ids:
            q_state.job_ids.append(job_id)

    def dequeue(self, job_id: str) -> None:
        """Remove job from its queue."""
        job = self.job_manager.jobs.get(job_id)
        if job and job.queue_id in self.queues:
            q_state = self.queues[job.queue_id]
            if job_id in q_state.job_ids:
                q_state.job_ids.remove(job_id)
        else:
            for q in self.queues.values():
                if job_id in q.job_ids:
                    q.job_ids.remove(job_id)
