import subprocess
import threading
import os
import signal
import re
import time
import logging
from typing import Any
from .base import BaseEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [YTDLPEngine] - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("YTDLPEngine")

class YTDLPEngine(BaseEngine):
    def __init__(self):
        self.process = None
        self.job_id = None
        self.url = None
        self.output_path = None
        self._bridge = None
        self.is_paused = False
        
        # Regex to match yt-dlp's --newline output
        # e.g., [download]   1.5% of 10.00MiB at  2.00MiB/s ETA 00:04
        self.progress_regex = re.compile(r'\[download\]\s+([\d\.]+)%\s+of.*?at\s+([\d\.]+[KMG]?i?B/s)')

    def start(self, job_id: str, url: str, output_path: str, job_manager: Any) -> Any:
        from core.models import JobState
        
        self.job_id = job_id
        self.url = url
        self.output_path = output_path
        self._bridge = job_manager
        
        logger.info(f"Starting yt-dlp for Job {job_id} | URL: {url} | Path: {output_path}")
        
        cmd = [
            "yt-dlp",
            "--newline",
            "-P", output_path,
            "-o", "%(title)s.%(ext)s",
            url
        ]
        
        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Start a thread to read stdout
            t = threading.Thread(target=self._monitor_output, daemon=True)
            t.start()
            
            self._bridge.transition_job(self.job_id, JobState.RUNNING)
            # return the PID as a pseudo GID
            return str(self.process.pid)
            
        except FileNotFoundError:
            logger.error("yt-dlp not found in PATH. Is it installed?")
            self._bridge.transition_job(self.job_id, JobState.FAILED, "yt-dlp not installed")
            return "ERROR"
        except Exception as e:
            logger.error(f"Failed to start yt-dlp: {e}")
            self._bridge.transition_job(self.job_id, JobState.FAILED, str(e))
            return "ERROR"

    def _monitor_output(self):
        from core.models import JobState
        filename = "Unknown"
        last_update_time = 0
        UPDATE_INTERVAL = 1.0  # seconds
        
        try:
            for line in self.process.stdout:
                # Check for Destination line to extract filename
                if "[download] Destination:" in line:
                    filename = line.split("[download] Destination:")[1].strip()
                # If it says it's already downloaded
                elif "[download]" in line and "has already been downloaded" in line:
                    filename = line.split("[download]")[1].split("has already")[0].strip()
                    self._bridge.update_progress(self.job_id, {
                        "percent": 100,
                        "speed": "0 B/s",
                        "filename": os.path.basename(filename)
                    })

                match = self.progress_regex.search(line)
                if match:
                    percent_str = match.group(1)
                    speed_str = match.group(2)
                    
                    try:
                        percent = float(percent_str)
                        current_time = time.time()
                        
                        # Throttle updates to avoid spamming the database/UI
                        if current_time - last_update_time >= UPDATE_INTERVAL or percent == 100:
                            self._bridge.update_progress(self.job_id, {
                                "percent": percent,
                                "speed": speed_str,
                                "filename": os.path.basename(filename) if filename != "Unknown" else filename
                            })
                            last_update_time = current_time
                    except ValueError:
                        pass
        except Exception as e:
            logger.error(f"Error reading stdout: {e}")
            
        self.process.wait()
        retcode = self.process.returncode
        
        # Determine status based on retcode.
        # However, check current state via bridge so we don't override STOPPED/PAUSED wrongly
        job = self._bridge.get_job(self.job_id)
        if job and job.state in (JobState.STOPPED, JobState.PAUSED, JobState.FAILED):
            return # Was ended manually, pause transition, or already tracked failure
            
        if retcode == 0:
            logger.info(f"YTDLPEngine finished Job {self.job_id} successfully.")
            self._bridge.transition_job(self.job_id, JobState.COMPLETED)
        else:
            logger.error(f"YTDLPEngine failed Job {self.job_id} with exit code {retcode}.")
            self._bridge.transition_job(self.job_id, JobState.FAILED, f"Exit code {retcode}")

    def cancel(self):
        self.stop()

    def stop(self):
        from core.models import JobState
        if self.process:
            logger.info(f"Stopping yt-dlp process {self.process.pid}")
            try:
                self.process.terminate()
                self._bridge.transition_job(self.job_id, JobState.STOPPED)
            except Exception as e:
                logger.error(f"Error terminating yt-dlp: {e}")

    def pause(self):
        from core.models import JobState
        if self.process and not self.is_paused:
            logger.info(f"Pausing yt-dlp process {self.process.pid}")
            try:
                os.kill(self.process.pid, signal.SIGSTOP)
                self.is_paused = True
                self._bridge.transition_job(self.job_id, JobState.PAUSED)
            except Exception as e:
                logger.error(f"Error pausing yt-dlp: {e}")

    def resume(self):
        from core.models import JobState
        if self.process and self.is_paused:
            logger.info(f"Resuming yt-dlp process {self.process.pid}")
            try:
                os.kill(self.process.pid, signal.SIGCONT)
                self.is_paused = False
                self._bridge.transition_job(self.job_id, JobState.RUNNING)
            except Exception as e:
                logger.error(f"Error resuming yt-dlp: {e}")

    def sync_state(self, job_id: str, job_manager: Any):
        # We passively handle state autonomously via _monitor_output
        pass
