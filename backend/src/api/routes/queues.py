from fastapi import APIRouter, Depends
from typing import Dict, Any
from api.dependencies import get_current_user
from api.state import job_manager

router = APIRouter(prefix="/api", tags=["Queues"])

@router.get("/queues")
def get_all_queues(user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Get all queues."""
    queues_list = []
    for queue_id, config in job_manager.configs.items():
        queues_list.append({
            "queue_id": queue_id,
            "max_parallel_jobs": config.max_parallel_jobs,
            "max_threads_per_job": config.max_threads_per_job,
            "priority": config.priority
        })
    return {"queues": queues_list, "total": len(queues_list)}
