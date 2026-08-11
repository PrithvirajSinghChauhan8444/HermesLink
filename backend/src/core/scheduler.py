from typing import Optional
from datetime import datetime
from models import Job, JobState

class Scheduler:
    def __init__(self, job_manager):
        self.job_manager = job_manager

    def get_active_job(self) -> Optional[Job]:
        """Returns the job currently in RUNNING state (if any)."""
        for job in self.job_manager.jobs.values():
            if job.state == JobState.RUNNING:
                return job
        return None

    def process_queues(self) -> None:
        """
        Main Scheduler Loop.
        Attempt to start jobs based on priority and constraints.
        Enforces Global Single Active Job rule.
        """
        if self.get_active_job():
            return

        sorted_queues = sorted(
            self.job_manager.queue_manager.configs.values(), 
            key=lambda config: config.priority, 
            reverse=True
        )

        for config in sorted_queues:
            if not config.enabled:
                continue
            
            queue_id = config.queue_id
            if queue_id not in self.job_manager.queue_manager.queues:
                continue
            
            queue_running_count = sum(
                1 for jid in self.job_manager.queue_manager.queues[queue_id].job_ids 
                if self.job_manager.jobs.get(jid) and self.job_manager.jobs[jid].state == JobState.RUNNING
            )
            
            if queue_running_count >= config.max_parallel_jobs:
                continue

            candidate_job_id = None
            for jid in self.job_manager.queue_manager.queues[queue_id].job_ids:
                job = self.job_manager.jobs.get(jid)
                if job and job.state == JobState.PENDING:
                    if job.scheduled_at:
                        try:
                            scheduled_time = datetime.fromisoformat(job.scheduled_at)
                            if datetime.now() < scheduled_time:
                                continue
                        except ValueError:
                            pass
                    candidate_job_id = jid
                    break
            
            if candidate_job_id:
                print(f"[Scheduler] Starting Job {candidate_job_id} from Queue '{queue_id}'")
                try:
                    self.job_manager.transition_job(candidate_job_id, JobState.RUNNING)
                    return 
                except Exception as e:
                    print(f"[Scheduler] Failed to start job {candidate_job_id}: {e}")
                    try:
                        self.job_manager.transition_job(candidate_job_id, JobState.FAILED, error_reason=str(e))
                    except:
                        pass
                    return
