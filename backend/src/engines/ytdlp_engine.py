import subprocess
import threading
import os
import signal
import re
import time
import logging
from typing import Any, Dict, Optional
from .base_engine import BaseEngine
from models.job import JobState
from tools.classifier import categorize_download
from utils.ytdlp_auth import get_auth_args

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [YTDLPEngine] - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("YTDLPEngine")

class YTDLPEngine(BaseEngine):
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.job_id: Optional[str] = None
        self.url: Optional[str] = None
        self.output_path: Optional[str] = None
        self.job_bridge: Any = None
        self.is_paused = False
        
        # Regex to match yt-dlp's --newline output
        # e.g., [download]   1.5% of 10.00MiB at  2.00MiB/s ETA 00:04
        self.progress_regex = re.compile(
            r'\[download\]\s+([\d\.]+)%\s+of\s+(?:~?\s*)?([\d\.]+[kKmMgG]?i?[bB])\s+at\s+([\d\.]+[kKmMgG]?i?[bB]/s)(?:\s+ETA\s+([\d:]+))?'
        )

    def _parse_size_to_bytes(self, size_str: str) -> int:
        if not size_str:
            return 0
        size_upper = size_str.upper()
        multiplier = 1
        if 'K' in size_upper: multiplier = 1024
        elif 'M' in size_upper: multiplier = 1024**2
        elif 'G' in size_upper: multiplier = 1024**3
        
        num_str = re.sub(r'[A-Za-z]+', '', size_str).strip()
        try:
            return int(float(num_str) * multiplier)
        except ValueError:
            return 0

    def start(self, job_id: str, url: str, output_path: str, job_manager: Any) -> str:
        self.job_id = job_id
        self.url = url
        self.job_bridge = job_manager
        
        job_obj = self.job_bridge.get_job(self.job_id)
        selected_format = None
        original_file_name = None
        by_user_file_name = None
        use_dynamic_folder = True
        
        if job_obj and job_obj.engine_config:
            selected_format = job_obj.engine_config.get("format")
            original_file_name = job_obj.engine_config.get("original_file_name")
            by_user_file_name = job_obj.engine_config.get("by_user_file_name")
            use_dynamic_folder = job_obj.engine_config.get("dynamic_folder", True)
        
        # Dynamic Folder Routing
        if use_dynamic_folder:
            category = categorize_download(url, 'media', job_obj, filename=original_file_name)
            output_path = os.path.join(output_path, category)
            
        os.makedirs(output_path, exist_ok=True)
        self.output_path = output_path
        
        logger.info(f"Starting yt-dlp for Job {job_id} | URL: {url} | Path: {output_path}")
        
        out_template = "%(title)s.%(ext)s"
        if by_user_file_name:
            if '.' in by_user_file_name:
                out_template = by_user_file_name
            else:
                out_template = f"{by_user_file_name}.%(ext)s"

        import sys
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--newline",
            "--no-playlist",
            "-P", output_path,
            "-o", out_template
        ]
        
        # Add authentication arguments (OAuth or cookies) to bypass YouTube bot detection
        cmd.extend(get_auth_args())
            
        if selected_format:
            cmd.extend(["-f", selected_format])
            
        cmd.append(url)
        
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
            
            self.job_bridge.transition_job(self.job_id, JobState.RUNNING)
            # return the PID as a pseudo GID
            return str(self.process.pid)
            
        except FileNotFoundError:
            logger.error("yt-dlp not found in PATH. Is it installed?")
            self.job_bridge.transition_job(self.job_id, JobState.FAILED, "yt-dlp not installed")
            return "ERROR"
        except Exception as e:
            logger.error(f"Failed to start yt-dlp: {e}")
            self.job_bridge.transition_job(self.job_id, JobState.FAILED, str(e))
            return "ERROR"

    def _monitor_output(self) -> None:
        filename = "Unknown"
        last_update_time = 0.0
        UPDATE_INTERVAL = 1.0  # seconds
        
        try:
            if self.process and self.process.stdout:
                for line in self.process.stdout:
                    # Check for Destination line to extract filename
                    if "[download] Destination:" in line:
                        filename = line.split("[download] Destination:")[1].strip()
                    # If it says it's already downloaded
                    elif "[download]" in line and "has already been downloaded" in line:
                        filename = line.split("[download]")[1].split("has already")[0].strip()
                        self.job_bridge.update_progress(self.job_id, {
                            "percent": 100.0,
                            "speed": "0 B/s",
                            "filename": os.path.basename(filename)
                        })

                    match = self.progress_regex.search(line)
                    if match:
                        percent_str = match.group(1)
                        size_str = match.group(2)
                        speed_str = match.group(3)
                        eta_str = match.group(4) or ""
                        
                        try:
                            percent = float(percent_str)
                            total_bytes = self._parse_size_to_bytes(size_str)
                            completed_bytes = int(total_bytes * (percent / 100.0))

                            current_time = time.time()
                            
                            if current_time - last_update_time >= UPDATE_INTERVAL or percent >= 100.0:
                                self.job_bridge.update_progress(self.job_id, {
                                    "percent": percent,
                                    "speed": speed_str,
                                    "eta": eta_str,
                                    "total_length": total_bytes,
                                    "completed_length": completed_bytes,
                                    "filename": os.path.basename(filename) if filename != "Unknown" else filename
                                })
                                last_update_time = current_time
                        except ValueError:
                            pass
        except Exception as e:
            logger.error(f"Error reading stdout: {e}")
            
        if self.process:
            self.process.wait()
            retcode = self.process.returncode
        else:
            retcode = -1
        
        job = self.job_bridge.get_job(self.job_id)
        if job and job.state in (JobState.STOPPED, JobState.PAUSED, JobState.FAILED):
            return
            
        if retcode == 0:
            logger.info(f"YTDLPEngine finished Job {self.job_id} successfully.")
            self.job_bridge.transition_job(self.job_id, JobState.COMPLETED)
        else:
            logger.error(f"YTDLPEngine failed Job {self.job_id} with exit code {retcode}.")
            self.job_bridge.transition_job(self.job_id, JobState.FAILED, f"Exit code {retcode}")

    def cancel(self) -> None:
        self.stop()

    def stop(self) -> None:
        if self.process:
            logger.info(f"Stopping yt-dlp process {self.process.pid}")
            try:
                self.process.terminate()
                self.job_bridge.transition_job(self.job_id, JobState.STOPPED)
            except Exception as e:
                logger.error(f"Error terminating yt-dlp: {e}")

    def pause(self) -> None:
        if self.process and not self.is_paused:
            logger.info(f"Pausing yt-dlp process {self.process.pid}")
            try:
                os.kill(self.process.pid, signal.SIGSTOP)
                self.is_paused = True
                self.job_bridge.transition_job(self.job_id, JobState.PAUSED)
            except Exception as e:
                logger.error(f"Error pausing yt-dlp: {e}")

    def resume(self) -> None:
        if self.process and self.is_paused:
            logger.info(f"Resuming yt-dlp process {self.process.pid}")
            try:
                os.kill(self.process.pid, signal.SIGCONT)
                self.is_paused = False
                self.job_bridge.transition_job(self.job_id, JobState.RUNNING)
            except Exception as e:
                logger.error(f"Error resuming yt-dlp: {e}")

    def sync_state(self, job_id: str, job_manager: Any) -> None:
        # Passive state handling via _monitor_output thread
        pass
