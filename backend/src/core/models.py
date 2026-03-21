from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid

class JobState(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"
    STOPPED = "STOPPED"

@dataclass
class QueueConfig:
    queue_id: str
    max_parallel_jobs: int = 1
    max_threads_per_job: int = 4
    priority: int = 0
    enabled: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "queue_id": self.queue_id,
            "max_parallel_jobs": self.max_parallel_jobs,
            "max_threads_per_job": self.max_threads_per_job,
            "priority": self.priority,
            "enabled": self.enabled,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'QueueConfig':
        return cls(
            queue_id=data.get("queue_id"),
            max_parallel_jobs=data.get("max_parallel_jobs", 1),
            max_threads_per_job=data.get("max_threads_per_job", 4),
            priority=data.get("priority", 0),
            enabled=data.get("enabled", True),
        )

@dataclass
class QueueState:
    queue_id: str
    job_ids: List[str] = field(default_factory=list) # Ordered list of job_ids
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "queue_id": self.queue_id,
            "job_ids": self.job_ids
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'QueueState':
        return cls(
            queue_id=data.get("queue_id"),
            job_ids=data.get("job_ids", [])
        )

@dataclass
class Job:
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    device_id: Optional[str] = None
    state: JobState = JobState.PENDING
    engine_config: Dict[str, Any] = field(default_factory=dict)
    error_reason: Optional[str] = None
    progress: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.isoformat(datetime.now()))
    updated_at: str = field(default_factory=lambda: datetime.isoformat(datetime.now()))
    queue_id: str = "default"
    thread_limit: int = 4

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "device_id": self.device_id,
            "state": self.state.value,
            "engine_config": self.engine_config,
            "error_reason": self.error_reason,
            "progress": self.progress,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "queue_id": self.queue_id,
            "thread_limit": self.thread_limit,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Job':
        job = cls(
            job_id=data.get("job_id"),
            device_id=data.get("device_id"),
            engine_config=data.get("engine_config", {}),
            error_reason=data.get("error_reason"),
            progress=data.get("progress", {}),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            queue_id=data.get("queue_id", "default"),
            thread_limit=data.get("thread_limit", 4),
        )
        job.state = JobState(data.get("state", "PENDING"))
        return job
