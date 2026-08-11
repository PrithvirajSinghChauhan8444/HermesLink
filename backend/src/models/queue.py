from dataclasses import dataclass, field
from typing import Any, Dict, List

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
    job_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "queue_id": self.queue_id,
            "job_ids": self.job_ids,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'QueueState':
        return cls(
            queue_id=data.get("queue_id"),
            job_ids=data.get("job_ids", []),
        )
