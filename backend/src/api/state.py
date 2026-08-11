from firebase import initialize_firebase
from core.job_manager import JobManager
from core.job_runner import JobRunner
from core.job_controller import JobController
from core.zombie_sweeper import ZombieSweeper

# Ensure Firebase is initialized before any database reference is requested
initialize_firebase()

job_manager = JobManager()
job_runner = JobRunner(job_manager)
job_controller = JobController(job_manager)
zombie_sweeper = ZombieSweeper(interval_seconds=120)
