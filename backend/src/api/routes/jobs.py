import requests
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.dependencies import get_current_user
from api.state import job_manager, job_controller
from models.job import JobState, Job
from tools.name_extractor import _get_filename_from_headers

router = APIRouter(prefix="/api", tags=["Jobs"])

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
    format: Optional[str] = None

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

class CreateJobRequest(BaseModel):
    url: str
    file_name: str
    type: str = "aria2"
    queue_id: str = "default"
    destination: Optional[str] = None
    format: Optional[str] = None

class JobActionRequest(BaseModel):
    action: str  # PAUSE | RESUME | STOP | RETRY | RESTART

# --- Helper Functions ---
def job_to_model(job: Job) -> JobModel:
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

@router.get("/jobs", response_model=JobListResponse)
def get_all_jobs(user: dict = Depends(get_current_user)) -> JobListResponse:
    """Get all jobs."""
    jobs = job_manager.list_jobs()
    return JobListResponse(
        jobs=[job_to_model(job) for job in jobs],
        total=len(jobs)
    )

@router.post("/jobs", response_model=JobModel, status_code=201)
def create_job(request: CreateJobRequest, user: dict = Depends(get_current_user)) -> JobModel:
    """Create a new download job and queue it for execution."""
    DEFAULT_DOWNLOAD_DIRECTORY = os.path.expanduser("~/Downloads/Hermeslink_downloads")
    try:
        destination = request.destination or DEFAULT_DOWNLOAD_DIRECTORY
        
        headers = {}
        try:
            response = requests.head(request.url, allow_redirects=True, timeout=3)
            headers = response.headers
        except Exception:
            pass
            
        file_name = _get_filename_from_headers(headers) if headers else None
        if not file_name:
            from urllib.parse import urlparse
            file_name = os.path.basename(urlparse(request.url).path) or "download"

        engine_config = {
            "url": request.url,
            "type": request.type,
            "destination": destination,
            "file_name": file_name,
            "format": request.format,
        }
        if request.queue_id not in job_manager.queues:
            raise HTTPException(
                status_code=400,
                detail=f"Queue '{request.queue_id}' does not exist.",
            )

        job = job_manager.create_job(config=engine_config, device_id="standalone", queue_id=request.queue_id)
        return job_to_model(job)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/active", response_model=JobListResponse)
def get_active_jobs(user: dict = Depends(get_current_user)) -> JobListResponse:
    """Get active jobs (PENDING, RUNNING, PAUSED)."""
    active_states = {JobState.PENDING, JobState.RUNNING, JobState.PAUSED}
    jobs = [job for job in job_manager.list_jobs() if job.state in active_states]
    jobs.sort(key=lambda j: j.created_at, reverse=True)
    return JobListResponse(jobs=[job_to_model(job) for job in jobs], total=len(jobs))

@router.get("/jobs/history", response_model=JobListResponse)
def get_job_history(user: dict = Depends(get_current_user)) -> JobListResponse:
    """Get completed/failed/stopped jobs (history)."""
    history_states = {JobState.COMPLETED, JobState.FAILED, JobState.STOPPED}
    jobs = [job for job in job_manager.list_jobs() if job.state in history_states]
    jobs.sort(key=lambda j: j.updated_at, reverse=True)
    return JobListResponse(jobs=[job_to_model(job) for job in jobs], total=len(jobs))

@router.get("/jobs/{job_id}", response_model=JobModel)
def get_job(job_id: str, user: dict = Depends(get_current_user)) -> JobModel:
    """Get a single job by ID."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job_to_model(job)

@router.post("/jobs/{job_id}/action")
def job_action(job_id: str, request: JobActionRequest, user: dict = Depends(get_current_user)) -> Dict[str, str]:
    """
    Send a control action to a job.
    Supported actions: PAUSE, RESUME, STOP, RETRY, RESTART
    """
    result = job_controller.handle_command(job_id, request.action)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/jobs/reload")
def reload_jobs(user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Reload jobs from disk (useful after external changes)."""
    job_manager.load_jobs()
    return {"status": "reloaded", "total_jobs": len(job_manager.list_jobs())}
