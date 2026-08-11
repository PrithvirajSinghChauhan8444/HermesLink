from typing import Any, Dict, Optional
from .firebase_client import get_realtime_database_reference

def _get_presence_ref(device_id: str) -> Any:
    return get_realtime_database_reference().child(f"presence/{device_id}")

def set_device_online(device_id: str, presence_data: Dict[str, Any]) -> None:
    """Sets a device status to online with all details in Realtime Database."""
    _get_presence_ref(device_id).set(presence_data)

def update_device_presence_fields(device_id: str, updates: Dict[str, Any]) -> None:
    """Updates specific fields of the device presence node."""
    _get_presence_ref(device_id).update(updates)

def update_device_heartbeat(device_id: str, timestamp_ms: int) -> None:
    """Updates only the last_seen heartbeat timestamp for a device."""
    _get_presence_ref(device_id).update({"last_seen": timestamp_ms})

def set_device_offline(device_id: str, timestamp_ms: int) -> None:
    """Sets a device status to offline in Realtime Database."""
    _get_presence_ref(device_id).update({
        "status": "offline",
        "last_seen": timestamp_ms
    })

def get_all_presence_data() -> Optional[Dict[str, Any]]:
    """Retrieves presence information for all registered devices."""
    return get_realtime_database_reference().child("presence").get()
