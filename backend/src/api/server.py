import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Ensure src path is loaded
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

load_dotenv()

from firebase import initialize_firebase
from api.state import job_runner, zombie_sweeper
from api.routes.jobs import router as jobs_router
from api.routes.queues import router as queues_router
from api.routes.media_info import router as media_info_router

DEFAULT_DOWNLOAD_DIRECTORY = os.path.expanduser("~/Downloads/Hermeslink_downloads")

# Initialize Firebase BEFORE app loading
try:
    initialize_firebase()
    print("[API] Firebase initialized successfully.")
except Exception as e:
    print(f"[API] Error initializing Firebase: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure default downloads dir exists
    os.makedirs(DEFAULT_DOWNLOAD_DIRECTORY, exist_ok=True)
    
    # Start background singletons
    job_runner.start()
    zombie_sweeper.start()
    print(f"[API] JobRunner and ZombieSweeper started. Default downloads directory: {DEFAULT_DOWNLOAD_DIRECTORY}")
    
    yield
    
    # Clean up on exit
    job_runner.stop()
    zombie_sweeper.stop()
    print("[API] Services gracefully stopped.")

app = FastAPI(
    title="HermesLink API",
    description="REST API for HermesLink Download Manager",
    version="1.0.0",
    lifespan=lifespan,
)

# Securely allow local development hosts and Vercel preview/production deployments
allowed_origins_regex = os.getenv(
    "ALLOWED_CORS_ORIGINS_REGEX",
    r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https?://[a-zA-Z0-9-]+\.vercel\.app"
)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=allowed_origins_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom handler for CORS error responses on 405 Method Not Allowed
@app.exception_handler(405)
async def method_not_allowed_handler(request: Request, exc: Exception) -> JSONResponse:
    origin = request.headers.get("origin", "")
    headers = {
        "Access-Control-Allow-Origin": origin if origin else "*",
        "Access-Control-Allow-Credentials": "true"
    }
    return JSONResponse(
        status_code=405,
        content={"detail": "Method Not Allowed"},
        headers=headers,
    )

app.include_router(jobs_router)
app.include_router(queues_router)
app.include_router(media_info_router)

@app.get("/")
def root() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "HermesLink API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
