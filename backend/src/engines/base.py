from abc import ABC, abstractmethod
from typing import Optional, Any

class BaseEngine(ABC):
    @abstractmethod
    def start(self, job_id: str, url: str, output_path: str, job_manager: Any) -> Any:
        """
        Starts a download job.
        
        Args:
            job_id: The unique ID of the job.
            url: The URL to download.
            output_path: The destination directory.
            job_manager: The JobManager instance to report state changes to.
            
        Returns:
            Any backend-specific ID (e.g. GID) or None.
        """
        pass

    @abstractmethod
    def cancel(self):
        """Cancels the current download job."""
        pass
    
    def sync_state(self, job_id: str, job_manager: Any):
        """
        Optional: Called periodically by the controller to sync external state (e.g. Aria2 RPC) 
        to the JobManager.
        """
        pass
