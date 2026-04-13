"""
HermesLink REST API Server

Exposes job data over HTTP for the frontend.
Queues are managed directly via Firestore (not this API).
Runs a JobRunner in the background so web-submitted downloads are
actually executed (same as the CLI controller.py does).
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Ensure src is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from core.job_manager import JobManager
from core.models import JobState
from core.job_runner import JobRunner
from core.job_controller import JobController
from core.zombie_sweeper import ZombieSweeper
from core.firebase_config import initialize_firebase

# Default download directory (same as controller.py)
DEFAULT_DOWNLOAD_DIR = os.path.expanduser("~/Downloads/hermeslink_downloads")

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


# --- Shared state ---

# Initialize Firebase BEFORE JobManager so it can load data from Firestore on init
try:
    initialize_firebase()
    print("[API] Firebase initialized successfully.")
except Exception as e:
    print(f"[API] Error initializing Firebase: {e}")

job_manager = JobManager()
job_runner = JobRunner(job_manager)
job_controller = JobController(job_manager)
zombie_sweeper = ZombieSweeper(interval_seconds=120)

# --- Lifespan: start/stop the runner with the server ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the default download directory exists at startup
    os.makedirs(DEFAULT_DOWNLOAD_DIR, exist_ok=True)
    # Start the background runner thread
    job_runner.start()
    zombie_sweeper.start()
    print(f"[API] JobRunner started. Downloads will be saved to: {DEFAULT_DOWNLOAD_DIR}")
    yield
    # Cleanly stop the runner when the server shuts down
    job_runner.stop()
    zombie_sweeper.stop()
    print("[API] Services gracefully stopped.")

# --- App Setup ---

app = FastAPI(
    title="HermesLink API",
    description="REST API for HermesLink Download Manager",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend dev server
ORIGINS = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure CORS headers are present even on error responses (Starlette omits them
# for non-routed responses such as 405 Method Not Allowed).
@app.exception_handler(405)
async def method_not_allowed_handler(request: Request, exc):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=405,
        content={"detail": "Method Not Allowed"},
        headers=headers,
    )

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


# --- Request Models ---

class CreateJobRequest(BaseModel):
    url: str
    type: str = "aria2"
    queue_id: str = "default"
    destination: Optional[str] = None
    format: Optional[str] = None

class JobActionRequest(BaseModel):
    action: str  # PAUSE | RESUME | STOP | RETRY | RESTART

# --- Auth Helper ---

def get_current_user(request: Request):
    """
    Dependency to extract and verify the Firebase ID token from the Authorization header.
    For this application, any valid Firebase token is accepted as the 'admin' user.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    try:
        from core.firebase_config import get_auth
        decoded_token = get_auth().verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# --- API Endpoints ---

@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "HermesLink API"}


@app.get("/api/jobs", response_model=JobListResponse)
def get_all_jobs(user: dict = Depends(get_current_user)):
    """Get all jobs."""
    jobs = job_manager.list_jobs()
    return JobListResponse(
        jobs=[job_to_model(job) for job in jobs],
        total=len(jobs)
    )



@app.post("/api/jobs", response_model=JobModel, status_code=201)
def create_job(request: CreateJobRequest, user: dict = Depends(get_current_user)):
    """Create a new download job and queue it for execution."""
    try:
        destination = request.destination or DEFAULT_DOWNLOAD_DIR
        engine_config = {
            "url": request.url,
            "type": request.type,
            "destination": destination,
            "format": request.format,
        }
        if request.queue_id not in job_manager.queues:
            raise HTTPException(
                status_code=400,
                detail=f"Queue '{request.queue_id}' does not exist.",
            )

        job = job_manager.create_job(config=engine_config, queue_id=request.queue_id)
        return job_to_model(job)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/active", response_model=JobListResponse)
def get_active_jobs(user: dict = Depends(get_current_user)):
    """Get active jobs (PENDING, RUNNING, PAUSED)."""
    active_states = {JobState.PENDING, JobState.RUNNING, JobState.PAUSED}
    jobs = [job for job in job_manager.list_jobs() if job.state in active_states]
    jobs.sort(key=lambda j: j.created_at, reverse=True)
    return JobListResponse(jobs=[job_to_model(job) for job in jobs], total=len(jobs))


@app.get("/api/jobs/history", response_model=JobListResponse)
def get_job_history(user: dict = Depends(get_current_user)):
    """Get completed/failed/stopped jobs (history)."""
    history_states = {JobState.COMPLETED, JobState.FAILED, JobState.STOPPED}
    jobs = [job for job in job_manager.list_jobs() if job.state in history_states]
    jobs.sort(key=lambda j: j.updated_at, reverse=True)
    return JobListResponse(jobs=[job_to_model(job) for job in jobs], total=len(jobs))


@app.get("/api/jobs/{job_id}", response_model=JobModel)
def get_job(job_id: str, user: dict = Depends(get_current_user)):
    """Get a single job by ID."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job_to_model(job)


@app.post("/api/jobs/{job_id}/action")
def job_action(job_id: str, request: JobActionRequest, user: dict = Depends(get_current_user)):
    """
    Send a control action to a job.
    Supported actions: PAUSE, RESUME, STOP, RETRY, RESTART
    """
    result = job_controller.handle_command(job_id, request.action)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result




@app.post("/api/jobs/reload")
def reload_jobs(user: dict = Depends(get_current_user)):
    """Reload jobs from disk (useful after external changes)."""
    job_manager.load_jobs()
    return {"status": "reloaded", "total_jobs": len(job_manager.list_jobs())}


@app.get("/api/yt-dlp/info")
def get_yt_dlp_info(url: str, user: dict = Depends(get_current_user)):
    """Fetch video metadata and available formats using yt-dlp."""
    import subprocess
    import json
    try:
        process = subprocess.run(
            ["yt-dlp", "--dump-json", "--no-playlist", "--no-warnings", url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        data = json.loads(process.stdout)
        formats = data.get("formats", [])
        return {
            "title": data.get("title", "Unknown"),
            "duration": data.get("duration", 0),
            "thumbnail": data.get("thumbnail", ""),
            "formats": [
                {
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "resolution": f.get("resolution", "audio only" if f.get("vcodec") == "none" else "unknown"),
                    "vcodec": f.get("vcodec"),
                    "acodec": f.get("acodec"),
                    "format_note": f.get("format_note"),
                    "filesize": f.get("filesize", 0)
                } for f in formats if f.get("format_id")
            ]
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"yt-dlp error: {e.stderr}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse yt-dlp output")



@app.get("/api/queues")
def get_all_queues(user: dict = Depends(get_current_user)):
    """Get all queues."""
    queues_list = []
    for qid, config in job_manager.configs.items():
        queues_list.append({
            "queue_id": qid,
            "max_parallel_jobs": config.max_parallel_jobs,
            "max_threads_per_job": config.max_threads_per_job,
            "priority": config.priority
        })
    return {"queues": queues_list, "total": len(queues_list)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
