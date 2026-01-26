import json
import requests
import uuid
import subprocess
import time
import logging
import os
from .base import BaseEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [Aria2Engine] - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("Aria2Engine")

class Aria2Engine(BaseEngine):
    def __init__(self, rpc_url="http://localhost:6800/jsonrpc", secret=None):
        self.rpc_url = rpc_url
        self.secret = secret
        self.gid = None
        self.aria2_process = None
        
        # Phase 1-9: Error State Tracking
        self.is_downgraded = False
        self.current_url = None
        self.current_output_path = None

    def _call_rpc(self, method, params, silent=False):
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": method,
            "params": params
        }
        
        if self.secret:
            payload["params"].insert(0, f"token:{self.secret}")

        try:
            if not silent:
                logger.debug(f"Calling RPC method: {method}")
            # Slightly longer timeout for control actions
            response = requests.post(self.rpc_url, json=payload, timeout=5) 
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if not silent:
                logger.error(f"RPC Connection Error: {e}")
            return None

    def _is_daemon_running(self):
        """Checks if the aria2 daemon is responsive via RPC."""
        logger.info("Checking if Aria2 daemon is running...")
        response = self._call_rpc("aria2.getVersion", [], silent=True)
        if response and "result" in response:
            logger.info(f"Aria2 is running. Version: {response['result'].get('version')}")
            return True
        logger.info("Aria2 daemon is NOT responding.")
        return False

    def _start_daemon(self):
        """Starts the aria2 daemon subprocess."""
        logger.info("Attempting to start aria2c daemon...")
        try:
            cmd = ["aria2c", "--enable-rpc", "--rpc-listen-all=false", "--rpc-allow-origin-all"]
            self.aria2_process = subprocess.Popen(
                cmd, 
                stdout=subprocess.DEVNULL, 
                stderr=subprocess.DEVNULL,
                shell=False
            )
            logger.info(f"aria2c process started with PID: {self.aria2_process.pid}")
            
            logger.info("Waiting for daemon to initialize...")
            for i in range(5):
                time.sleep(1)
                if self._is_daemon_running():
                    logger.info("Aria2 daemon started and verified successfully.")
                    return True
                logger.debug(f"Waiting... ({i+1}/5)")
            
            logger.error("Timed out waiting for Aria2 daemon to respond.")
            return False
            
        except FileNotFoundError:
            logger.critical("Error: 'aria2c' executable not found in PATH. Please install aria2.")
            return False
        except Exception as e:
            logger.critical(f"Failed to start aria2c: {e}")
            return False

    def ensure_daemon_running(self):
        """Ensures the daemon is running (Start -> Check -> Start if needed)."""
        if self._is_daemon_running():
            return True
        if self._start_daemon():
            return True
        return False

    def start(self, job_id: str, url: str, output_path: str, job_manager: Any) -> str:
        logger.info(f"Starting download process for Job {job_id} | URL: {url}")
        
        self.current_url = url
        self.current_output_path = output_path
        self.is_downgraded = False 
        
        from src.core.models import JobState
        
        if not self.ensure_daemon_running():
            logger.error("Could not verify or start Aria2 daemon. Aborting.")
            job_manager.transition_job(job_id, JobState.FAILED, "Aria2 Daemon Failed")
            return "ERROR_DAEMON_FAILED"

        gid = self._add_uri_internal(url, output_path, use_multithread=True)
        
        if gid and gid != "ERROR":
            self.gid = gid
            job_manager.transition_job(job_id, JobState.RUNNING)
            return gid
        else:
            job_manager.transition_job(job_id, JobState.FAILED, "Failed to add URI to Aria2")
            return "ERROR"

    def _add_uri_internal(self, url, output_path, use_multithread=True):
        logger.info(f"Sending addUri command to {self.rpc_url} (Multi-thread: {use_multithread})")
        
        options = {
            "dir": output_path,
            "check-certificate": "false",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        if use_multithread:
            options.update({
                "max-connection-per-server": "16",
                "split": "16",
                "min-split-size": "1M"
            })
        else:
             options.update({
                "max-connection-per-server": "1",
                "split": "1",
                "min-split-size": "1M"
            })

        response = self._call_rpc("aria2.addUri", [[url], options])
        
        if response and "result" in response:
            return response["result"]
        else:
            return "ERROR"

    def cancel(self):
        """Phase 6: Stop/Cancel - Destructive Control"""
        self.stop()

    def sync_state(self, job_id: str, job_manager: Any):
        """Syncs Aria2 status to JobManager."""
        from src.core.models import JobState
        
        if not self.gid:
            return

        status = self.get_status()
        if not status:
            # Maybe lost connection?
            return

        aria2_status = status.get("status") # active, waiting, paused, error, complete, removed
        
        # Calculate Progress
        percent, speed_str = self.calculate_progress(status)
        job_manager.update_progress(job_id, {
            "percent": percent,
            "speed": speed_str,
            "total_length": status.get("totalLength"),
            "completed_length": status.get("completedLength"),
            "eta": "N/A" # Could calculate ETA
        })

        # State Mapping
        current_job = job_manager.get_job(job_id)
        if not current_job: 
            return
            
        current_internal_state = current_job.state

        if aria2_status == "active" and current_internal_state != JobState.RUNNING:
            try: job_manager.transition_job(job_id, JobState.RUNNING)
            except: pass
        elif aria2_status == "paused" and current_internal_state != JobState.PAUSED:
            try: job_manager.transition_job(job_id, JobState.PAUSED)
            except: pass
        elif aria2_status == "complete" and current_internal_state != JobState.COMPLETED:
            try: job_manager.transition_job(job_id, JobState.COMPLETED)
            except: pass
        elif aria2_status == "error" and current_internal_state != JobState.FAILED:
            error_msg = status.get("errorMessage", "Unknown Aria2 Error")
            try: job_manager.transition_job(job_id, JobState.FAILED, error_msg)
            except: pass
        elif aria2_status == "removed" and current_internal_state != JobState.STOPPED:
             try: job_manager.transition_job(job_id, JobState.STOPPED)
             except: pass

    # --- Phase 1 & 2: Progress & Status ---
    def get_status(self):
        """Queries aria2 for status of current GID."""
        if not self.gid:
            return None
        
        response = self._call_rpc("aria2.tellStatus", [self.gid])
        if response and "result" in response:
            return response["result"]
        return None

    def calculate_progress(self, status):
        """Calculates percentage and formats speed."""
        if not status:
            return 0, "0 KB/s"
        
        completed = int(status.get("completedLength", 0))
        total = int(status.get("totalLength", 0))
        speed_bps = int(status.get("downloadSpeed", 0))
        
        percent = (completed / total) * 100 if total > 0 else 0
        speed_mbps = speed_bps / (1024 * 1024)
        
        return percent, f"{speed_mbps:.2f} MB/s"

    # --- Phase 4, 5, 6, 7: Control & Safety ---
    def pause(self):
        """Phase 4 & 7: Pause with safety check."""
        status_data = self.get_status()
        if not status_data:
            logger.warning("Cannot pause: Status unavailable.")
            return

        current_status = status_data.get("status")
        if current_status != "active":
            logger.warning(f"Cannot pause: Download is '{current_status}', must be 'active'.")
            return

        logger.info(f"Pausing download GID: {self.gid}")
        response = self._call_rpc("aria2.pause", [self.gid])
        if response and "result" in response:
             logger.info(f"Pause requested.")
        else:
             logger.error("Pause failed.")

    def resume(self):
        """Phase 5 & 7: Resume with safety check."""
        status_data = self.get_status()
        if not status_data:
            logger.warning("Cannot resume: Status unavailable.")
            return

        current_status = status_data.get("status")
        if current_status != "paused":
            logger.warning(f"Cannot resume: Download is '{current_status}', must be 'paused'.")
            return

        logger.info(f"Resuming download GID: {self.gid}")
        response = self._call_rpc("aria2.unpause", [self.gid])
        if response and "result" in response:
             logger.info(f"Resume requested.")
        else:
             logger.error("Resume failed.")

    def stop(self):
        """Phase 6 & 7: Stop/Remove with safety check."""
        if not self.gid:
            logger.warning("No active GID to stop.")
            return

        status_data = self.get_status()
        if status_data:
            current_status = status_data.get("status")
            if current_status not in ["active", "paused", "waiting"]:
                logger.warning(f"Cannot stop: Download is '{current_status}', already stopped or completed.")
                return

        logger.info(f"Stopping/Removing download GID: {self.gid}")
        response = self._call_rpc("aria2.remove", [self.gid])
        
        if response and "result" in response:
             logger.info(f"Stop successful (GID: {response['result']})")
        else:
             logger.error(f"Stop failed or already stopped.")

    def force_restart(self):
        """Manually force a restart of the download with cleanup."""
        logger.info("User requested Force Restart. Cleaning up...")
        
        # Try to get file info from current status if possible
        status_data = self.get_status()
        files = []
        if status_data:
             files = status_data.get("files", [])
        
        file_path = None
        if files and len(files) > 0:
            file_path = files[0].get("path")

        # Stop/Remove job
        self.stop() 
        
        # Delete physical files
        if file_path and os.path.exists(file_path):
             try:
                 logger.info(f"Cleanup: Deleting partial file {file_path}")
                 os.remove(file_path)
             except OSError as e:
                 logger.warning(f"Cleanup: Failed to delete {file_path}: {e}")
        
        if file_path:
            aria2_file = file_path + ".aria2"
            if os.path.exists(aria2_file):
                try:
                    logger.info(f"Cleanup: Deleting metadata file {aria2_file}")
                    os.remove(aria2_file)
                except OSError as e:
                    logger.warning(f"Cleanup: Failed to delete {aria2_file}: {e}")
        
        # Restart Safe (Single Thread)
        self.is_downgraded = True
        new_gid = self._add_uri_internal(self.current_url, self.current_output_path, use_multithread=False)
        
        if new_gid and new_gid != "ERROR":
            self.gid = new_gid
            return True, "Forced restart successful (Single Thread)."
        else:
            return False, "Failed to force restart."

    # --- Phase 1-9: Error Classification & Recovery ---
    def classify_error(self, error_message):
        """Phase 3: Classify raw error messages into types."""
        if not error_message:
            return "UNKNOWN"
        
        msg = error_message.lower()
        
        # Resume/Multi-thread issues
        if "invalid range header" in msg or "no uri available" in msg:
            return "RESUME_NOT_SUPPORTED"
            
        # Network issues
        if "time out" in msg or "connection refused" in msg:
             return "NETWORK_FAILURE"
             
        return "UNKNOWN"

    def recover(self):
        """Phase 4 & 6: Attempt to recover from error state."""
        status_data = self.get_status()
        if not status_data or status_data.get("status") != "error":
            logger.warning("Recover called but status is not error.")
            return False, "Not in error state"

        error_msg = status_data.get("errorMessage", "")
        error_type = self.classify_error(error_msg)
        
        logger.info(f"Attempting recovery. Error Type: {error_type} | Message: {error_msg}")
        
        # Strategy: Downgrade to single thread if resume failure detected
        if error_type == "RESUME_NOT_SUPPORTED" and not self.is_downgraded:
            logger.info("Applying Downgrade Strategy: Restarting with single connection...")
            
            # --- Cleanup Phase ---
            # 1. Get file path from status if available
            files = status_data.get("files", [])
            file_path = None
            if files and len(files) > 0:
                file_path = files[0].get("path")

            # 2. Stop/Remove job from Aria2
            self.stop() 
            
            # 3. Delete physical files
            if file_path and os.path.exists(file_path):
                 try:
                     logger.info(f"Cleanup: Deleting partial file {file_path}")
                     os.remove(file_path)
                 except OSError as e:
                     logger.warning(f"Cleanup: Failed to delete {file_path}: {e}")
            
            if file_path:
                aria2_file = file_path + ".aria2"
                if os.path.exists(aria2_file):
                    try:
                        logger.info(f"Cleanup: Deleting metadata file {aria2_file}")
                        os.remove(aria2_file)
                    except OSError as e:
                        logger.warning(f"Cleanup: Failed to delete {aria2_file}: {e}")
            
            # --- Restart Phase ---
            self.is_downgraded = True
            new_gid = self._add_uri_internal(self.current_url, self.current_output_path, use_multithread=False)
            
            if new_gid and new_gid != "ERROR":
                self.gid = new_gid
                return True, "Files cleaned. Downgraded to single-thread and restarted."
            else:
                return False, "Failed to restart downgraded download."
        
        elif error_type == "NETWORK_FAILURE":
             # Placeholder for simple retry logic (could be implemented with counter)
             return False, "Network failure - Automatic retry not yet implemented."
             
        return False, f"Unrecoverable error: {error_type}"
