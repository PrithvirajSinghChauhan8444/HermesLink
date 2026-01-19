from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Dict, Optional, Any
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
class Job:
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    state: JobState = JobState.PENDING
    engine_config: Dict[str, Any] = field(default_factory=dict)
    error_reason: Optional[str] = None
    progress: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.isoformat(datetime.now()))
    updated_at: str = field(default_factory=lambda: datetime.isoformat(datetime.now()))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "state": self.state.value,
            "engine_config": self.engine_config,
            "error_reason": self.error_reason,
            "progress": self.progress,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Job':
        job = cls(
            job_id=data.get("job_id"),
            engine_config=data.get("engine_config", {}),
            error_reason=data.get("error_reason"),
            progress=data.get("progress", {}),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )
        job.state = JobState(data.get("state", "PENDING"))
        return job
