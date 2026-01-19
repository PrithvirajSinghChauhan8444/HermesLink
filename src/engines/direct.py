import requests
import os
import time
from typing import Any
from urllib.parse import urlparse, unquote
from .base import BaseEngine

class DirectEngine(BaseEngine):
    def __init__(self):
        self.is_cancelled = False

    def cancel(self):
        print("[DirectEngine] Cancel requested.")
        self.is_cancelled = True

    def _get_filename(self, url, response):
        # Try to get filename from Content-Disposition
        if "Content-Disposition" in response.headers:
            import re
            fname = re.findall("filename=(.+)", response.headers["Content-Disposition"])
            if fname:
                return fname[0].strip().strip('"')
        
        # Fallback to URL path
        parsed_url = urlparse(url)
        return os.path.basename(unquote(parsed_url.path)) or "downloaded_file"

    def start(self, job_id: str, url: str, output_path: str, job_manager: Any) -> str:
        from src.core.models import JobState
        print(f"[DirectEngine] Starting download for Job {job_id} | URL: {url}")
        
        self.is_cancelled = False
        
        job_manager.transition_job(job_id, JobState.RUNNING)
        start_time = time.time()
        
        try:
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                filename = self._get_filename(url, r)
                filepath = os.path.join(output_path, filename)
                
                total_size = int(r.headers.get('content-length', 0))
                downloaded_size = 0
                
                print(f"[DirectEngine] Saving to: {filepath} (Size: {total_size} bytes)")
                
                with open(filepath, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        if self.is_cancelled:
                            print("[DirectEngine] Download cancelled during stream.")
                            job_manager.transition_job(job_id, JobState.STOPPED)
                            return "CANCELLED"
                        
                        if chunk:
                            f.write(chunk)
                            downloaded_size += len(chunk)
                            
                            # Calculate Progress
                            percent = (downloaded_size / total_size) * 100 if total_size > 0 else 0.0
                            
                            elapsed = time.time() - start_time
                            speed_bps = downloaded_size / elapsed if elapsed > 0 else 0
                            speed_mbps = speed_bps / (1024 * 1024)
                            
                            # Simple update every chunk might be too frequent, but JobManager saves json.
                            # Optimization: only update every 1% or every 0.1s? 
                            # For now, let's keep it simple, but maybe throttle slightly if performance hit.
                            
                            job_manager.update_progress(job_id, {
                                "percent": percent,
                                "speed": f"{speed_mbps:.2f} MB/s",
                                "total_length": total_size,
                                "completed_length": downloaded_size,
                                "filename": filename
                            })
                            
                print(f"[DirectEngine] Successfully downloaded: {filename}")
                job_manager.update_progress(job_id, {"percent": 100.0, "speed": "0", "filename": filename})
                job_manager.transition_job(job_id, JobState.COMPLETED)
                return "COMPLETED"
                
        except Exception as e:
            if self.is_cancelled:
                job_manager.transition_job(job_id, JobState.STOPPED)
                return "CANCELLED"
                
            error_msg = str(e)
            print(f"[DirectEngine] Error: {e}")
            job_manager.transition_job(job_id, JobState.FAILED, error_reason=error_msg)
            return "ERROR"
