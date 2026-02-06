"""
HermesLink REST API Server

Exposes job and queue data over HTTP for the frontend.
"""

import os
import sys
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure src is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from core.job_manager import JobManager
from core.models import JobState

# --- Pydantic Models for API responses ---

class ProgressModel(BaseModel):
    percent: Optional[float] = None
    speed: Optional[str] = None
    filename: Optional[str] = None
    total_length: Optional[int] = None
    completed_length: Optional[int] = None
    eta: Optional[str] = None

class EngineConfigModel(BaseModel):
    url: Optional[str] = None
    type: Optional[str] = None
    destination: Optional[str] = None

class JobModel(BaseModel):
    job_id: str
    state: str
    engine_config: EngineConfigModel
    error_reason: Optional[str] = None
    progress: ProgressModel
    created_at: str
    updated_at: str
    queue_id: str
    thread_limit: int

class JobListResponse(BaseModel):
    jobs: List[JobModel]
    total: int

class QueueConfigModel(BaseModel):
    queue_id: str
    max_parallel_jobs: int
    max_threads_per_job: int
    priority: int
    enabled: bool

class QueueListResponse(BaseModel):
    queues: List[QueueConfigModel]

# --- App Setup ---

app = FastAPI(
    title="HermesLink API",
    description="REST API for HermesLink Download Manager",
    version="1.0.0"
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize JobManager (read-only access to jobs.json)
job_manager = JobManager()

# --- Helper Functions ---

def job_to_model(job) -> JobModel:
    """Convert Job dataclass to Pydantic model."""
    job_dict = job.to_dict()
    return JobModel(
        job_id=job_dict["job_id"],
        state=job_dict["state"],
        engine_config=EngineConfigModel(**job_dict.get("engine_config", {})),
        error_reason=job_dict.get("error_reason"),
        progress=ProgressModel(**job_dict.get("progress", {})),
        created_at=job_dict["created_at"],
        updated_at=job_dict["updated_at"],
        queue_id=job_dict.get("queue_id", "default"),
        thread_limit=job_dict.get("thread_limit", 4)
    )

# --- API Endpoints ---

@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "HermesLink API"}


@app.get("/api/jobs", response_model=JobListResponse)
def get_all_jobs():
    """Get all jobs."""
    jobs = job_manager.list_jobs()
    return JobListResponse(
        jobs=[job_to_model(job) for job in jobs],
        total=len(jobs)
    )


@app.get("/api/jobs/active", response_model=JobListResponse)
def get_active_jobs():
    """Get active jobs (PENDING, RUNNING, PAUSED)."""
    active_states = {JobState.PENDING, JobState.RUNNING, JobState.PAUSED}
    jobs = [job for job in job_manager.list_jobs() if job.state in active_states]
    # Sort by created_at descending (newest first)
    jobs.sort(key=lambda j: j.created_at, reverse=True)
    return JobListResponse(
        jobs=[job_to_model(job) for job in jobs],
        total=len(jobs)
    )


@app.get("/api/jobs/history", response_model=JobListResponse)
def get_job_history():
    """Get completed/failed/stopped jobs (history)."""
    history_states = {JobState.COMPLETED, JobState.FAILED, JobState.STOPPED}
    jobs = [job for job in job_manager.list_jobs() if job.state in history_states]
    # Sort by updated_at descending (most recent first)
    jobs.sort(key=lambda j: j.updated_at, reverse=True)
    return JobListResponse(
        jobs=[job_to_model(job) for job in jobs],
        total=len(jobs)
    )


@app.get("/api/jobs/{job_id}", response_model=JobModel)
def get_job(job_id: str):
    """Get a single job by ID."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job_to_model(job)


@app.get("/api/queues", response_model=QueueListResponse)
def get_queues():
    """Get all queue configurations."""
    queues = []
    for queue_id, config in job_manager.queue_configs.items():
        queues.append(QueueConfigModel(
            queue_id=config.queue_id,
            max_parallel_jobs=config.max_parallel_jobs,
            max_threads_per_job=config.max_threads_per_job,
            priority=config.priority,
            enabled=config.enabled
        ))
    return QueueListResponse(queues=queues)


@app.post("/api/jobs/reload")
def reload_jobs():
    """Reload jobs from disk (useful after external changes)."""
    job_manager.load_jobs()
    return {"status": "reloaded", "total_jobs": len(job_manager.list_jobs())}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
