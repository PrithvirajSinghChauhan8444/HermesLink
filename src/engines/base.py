from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseEngine(ABC):
    @abstractmethod
    def start(self, url: str, output_path: str) -> str:
        """Starts a download job. Returns a job ID or status string."""
        pass

    @abstractmethod
    def cancel(self):
        """Cancels the current download job."""
        pass
