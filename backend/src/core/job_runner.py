import threading
import time
import sys
import os

# Ensure we can import engines
# (Assuming this runs from within the app structure)

from .job_manager import JobManager
from .models import JobState

class JobRunner:
    def __init__(self, job_manager: JobManager):
        self.job_manager = job_manager
        self.running = False
        self.thread = None
        
        self.current_job_id = None
        self.current_engine = None
        
        # Engines cache/factory
        # specific imports will happen inside to avoid circular deps if any, 
        # or we import at top if safe. Engines usually depend on base.
        
    def start(self):
        """Starts the Runner loop in a background thread."""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True, name="JobRunnerThread")
        self.thread.start()
        print("[JobRunner] Service started.")

    def stop(self):
        """Stops the Runner loop."""
        print("[JobRunner] Stopping service...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        
        # Cleanup active engine
        if self.current_engine:
            try:
                if hasattr(self.current_engine, 'cancel'):
                    self.current_engine.cancel()
                elif hasattr(self.current_engine, 'stop'):
                    self.current_engine.stop()
            except:
                pass

    def _loop(self):
        while self.running:
            try:
                active_job = self.job_manager.get_active_job()
                
                # 1. Check if we need to stop the current engine
                # (If there is no active job, OR the active job is different from what we are running)
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
                        # Same job running. Sync state if needed (e.g. Aria2)
                        if self.current_engine and hasattr(self.current_engine, 'sync_state'):
                            self.current_engine.sync_state(active_job.job_id, self.job_manager)

            except Exception as e:
                print(f"[JobRunner] Error in loop: {e}")
            
            time.sleep(1) # Poll interval
            
    def _create_engine(self, engine_type: str):
        if engine_type == "media":
            from engines.media import MediaEngine
            return MediaEngine()
        elif engine_type == "direct":
            from engines.direct import DirectEngine
            return DirectEngine()
        elif engine_type == "aria2":
            from engines.aria2 import Aria2Engine
            return Aria2Engine()
        else:
            raise ValueError(f"Unknown engine type: {engine_type}")

    def _start_engine_for_job(self, job):
        try:
            engine_type = job.engine_config.get('type', 'direct')
            url = job.engine_config.get('url')
            destination = job.engine_config.get('destination')
            
            engine = self._create_engine(engine_type)
            self.current_engine = engine
            self.current_job_id = job.job_id
            
            # Determine if we need a thread (Blocking vs Non-Blocking)
            # Media and Direct are Blocking. Aria2 is Non-Blocking.
            is_blocking = engine_type in ["media", "direct"]
            
            if is_blocking:
                def run_blocking():
                    try:
                        engine.start(job.job_id, url, destination, self.job_manager)
                        # Mark job as completed when engine returns cleanly
                        print(f"[JobRunner] Job {job.job_id} finished. Marking COMPLETED.")
                        self.job_manager.transition_job(job.job_id, JobState.COMPLETED)
                    except Exception as e:
                        print(f"[JobRunner] Error in blocking engine thread: {e}")
                        # Ensure job is marked failed if engine crashed
                        try:
                            self.job_manager.transition_job(job.job_id, JobState.FAILED, str(e))
                        except Exception:
                            pass
                    finally:
                        # Always clear tracker so the runner loop doesn't hold a dead reference
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

    def _stop_current_engine(self):
        if self.current_engine:
            try:
                if hasattr(self.current_engine, 'cancel'):
                    self.current_engine.cancel()
                elif hasattr(self.current_engine, 'stop'):
                    self.current_engine.stop()
            except Exception as e:
                print(f"[JobRunner] Error stopping engine: {e}")
        
        self.current_engine = None
        self.current_job_id = None
