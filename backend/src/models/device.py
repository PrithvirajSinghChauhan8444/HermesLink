from dataclasses import dataclass, field
from typing import Any, Dict

@dataclass
class DevicePresence:
    device_id: str
    name: str
    platform: str
    status: str = "offline"
    download_directory: str = ""
    storage_profiles: Dict[str, Any] = field(default_factory=dict)
    started_at: int = 0
    last_seen: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "device_id": self.device_id,
            "name": self.name,
            "platform": self.platform,
            "status": self.status,
            "download_directory": self.download_directory,
            "storage_profiles": self.storage_profiles,
            "started_at": self.started_at,
            "last_seen": self.last_seen,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DevicePresence':
        return cls(
            device_id=data.get("device_id"),
            name=data.get("name", ""),
            platform=data.get("platform", ""),
            status=data.get("status", "offline"),
            download_directory=data.get("download_directory", ""),
            storage_profiles=data.get("storage_profiles", {}),
            started_at=data.get("started_at", 0),
            last_seen=data.get("last_seen", 0),
        )
