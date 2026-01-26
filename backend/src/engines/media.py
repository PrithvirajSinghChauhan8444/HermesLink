import yt_dlp
import os
from typing import Any
from .base import BaseEngine

class MediaEngine(BaseEngine):
    def __init__(self):
        self.is_cancelled = False

    def cancel(self):
        print("[MediaEngine] Cancel requested.")
        self.is_cancelled = True

    def start(self, job_id: str, url: str, output_path: str, job_manager: Any) -> str:
        from src.core.models import JobState
        print(f"[MediaEngine] Starting download for Job {job_id} | URL: {url}")
        
        self.is_cancelled = False
        
        # Define hook with access to job_manager
        def progress_hook(d):
            if self.is_cancelled:
                raise Exception("Download Cancelled by User")

            if d['status'] == 'downloading':
                # Extract progress data
                # yt-dlp provides: _percent_str (e.g. " 5.0%"), _speed_str, etc.
                percent_str = d.get('_percent_str', '0%').strip().replace('%','')
                speed_str = d.get('_speed_str', 'N/A')
                eta_str = d.get('_eta_str', 'N/A')
                
                try:
                    percent = float(percent_str)
                except ValueError:
                    percent = 0.0

                job_manager.update_progress(job_id, {
                    "percent": percent,
                    "speed": speed_str,
                    "eta": eta_str,
                    "filename": d.get('filename')
                })
                
                # Ensure state is RUNNING
                current_job = job_manager.get_job(job_id)
                if current_job and current_job.state != JobState.RUNNING:
                    job_manager.transition_job(job_id, JobState.RUNNING)

            elif d['status'] == 'finished':
                job_manager.update_progress(job_id, {"percent": 100.0, "speed": "0", "eta": "Done"})

        ydl_opts = {
            'outtmpl': os.path.join(output_path, '%(title).100s.%(ext)s'), # Limit filename length
            'restrictfilenames': True, # ASCII only, no spaces
            'format': 'best',
            'quiet': True,
            'noprogress': True, # Explicitly disable native progress bar
            'no_warnings': True,
            'progress_hooks': [progress_hook],
        }

        try:
            job_manager.transition_job(job_id, JobState.RUNNING)
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Unknown')
                print(f"[MediaEngine] Successfully downloaded: {title}")
                
                job_manager.transition_job(job_id, JobState.COMPLETED)
                return "COMPLETED"
                
        except Exception as e:
            error_msg = str(e)
            if "Download Cancelled by User" in error_msg:
                print("[MediaEngine] Download cancelled.")
                job_manager.transition_job(job_id, JobState.STOPPED)
                return "CANCELLED"
            
            print(f"[MediaEngine] Error: {e}")
            job_manager.transition_job(job_id, JobState.FAILED, error_reason=error_msg)
            return "ERROR"
