import threading
import time
from typing import Optional, Any
from .job_manager import JobManager
from models import JobState, Job
from engines.base_engine import BaseEngine

class JobRunner:
    def __init__(self, job_manager: JobManager):
        self.job_manager = job_manager
        self.running = False
        self.thread: Optional[threading.Thread] = None
        
        self.current_job_id: Optional[str] = None
        self.current_engine: Optional[BaseEngine] = None

    def start(self) -> None:
        """Starts the Runner loop in a background thread."""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True, name="JobRunnerThread")
        self.thread.start()
        print("[JobRunner] Service started.")

    def stop(self) -> None:
        """Stops the Runner loop."""
        print("[JobRunner] Stopping service...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        
        # Cleanup active engine
        if self.current_engine:
            try:
                self.current_engine.cancel()
            except Exception as e:
                print(f"[JobRunner] Error cancelling current engine on stop: {e}")

    def _loop(self) -> None:
        while self.running:
            try:
                active_job = self.job_manager.get_active_job()
                
                # 1. Check if we need to stop the current engine
                if self.current_job_id:
                    if not active_job or active_job.job_id != self.current_job_id:
                        print(f"[JobRunner] Job {self.current_job_id} is no longer active. Stopping engine.")
                        self._stop_current_engine()

                # 2. Check if we need to start a new engine
                if active_job:
                    if self.current_job_id != active_job.job_id:
                        print(f"[JobRunner] Found new active Job {active_job.job_id}. Starting Engine...")
                        self._start_engine_for_job(active_job)
                    else:
                        # Same job running. Sync state if needed
                        if self.current_engine:
                            self.current_engine.sync_state(active_job.job_id, self.job_manager)

            except Exception as e:
                print(f"[JobRunner] Error in loop: {e}")
            
            time.sleep(1) # Poll interval
            
    def _create_engine(self, engine_type: str) -> BaseEngine:
        if engine_type in ["media", "yt-dlp"]:
            from engines.ytdlp_engine import YTDLPEngine
            return YTDLPEngine()
        elif engine_type == "direct":
            from engines.direct_engine import DirectEngine
            return DirectEngine()
        elif engine_type == "aria2":
            from engines.aria2_engine import Aria2Engine
            return Aria2Engine()
        else:
            raise ValueError(f"Unknown engine type: {engine_type}")

    def _start_engine_for_job(self, job: Job) -> None:
        try:
            engine_type = job.engine_config.get('type', 'direct')
            url = job.engine_config.get('url')
            destination = job.engine_config.get('destination')
            
            if not url or not destination:
                 raise ValueError("Missing 'url' or 'destination' in engine configuration.")

            engine = self._create_engine(engine_type)
            self.current_engine = engine
            self.current_job_id = job.job_id
            
            is_blocking = engine_type in ["media", "direct", "yt-dlp"]
            
            if is_blocking:
                def run_blocking() -> None:
                    try:
                        if engine:
                            engine.start(job.job_id, url, destination, self.job_manager)
                            print(f"[JobRunner] Job {job.job_id} finished. Marking COMPLETED.")
                            self.job_manager.transition_job(job.job_id, JobState.COMPLETED)
                    except Exception as engine_error:
                        print(f"[JobRunner] Error in blocking engine thread: {engine_error}")
                        try:
                            self.job_manager.transition_job(job.job_id, JobState.FAILED, str(engine_error))
                        except Exception:
                            pass
                    finally:
                        self.current_engine = None
                        self.current_job_id = None

                t = threading.Thread(target=run_blocking, daemon=True, name=f"Engine-{job.job_id}")
                t.start()
            else:
                # Non-blocking (Aria2)
                engine.start(job.job_id, url, destination, self.job_manager)
                
        except Exception as e:
            print(f"[JobRunner] Failed to start engine for job {job.job_id}: {e}")
            self.job_manager.transition_job(job.job_id, JobState.FAILED, f"Runner Start Error: {e}")
            self._stop_current_engine()

    def _stop_current_engine(self) -> None:
        if self.current_engine:
            try:
                self.current_engine.cancel()
            except Exception as e:
                print(f"[JobRunner] Error stopping engine: {e}")
        
        self.current_engine = None
        self.current_job_id = None
