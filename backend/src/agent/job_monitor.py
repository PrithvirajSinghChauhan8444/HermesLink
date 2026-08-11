import time
from typing import Any, Dict
from models.job import JobState
from firebase import update_job_progress, get_job_rtdb_data
from agent.archive_extractor import extract_archive
from agent.job_bridge import FirebaseJobBridge

def monitor_job(
    job_id: str, 
    engine: Any, 
    gid: str, 
    bridge: FirebaseJobBridge, 
    active_engines: Dict[str, Any],
    action_listener: Any = None, 
    job_data: Dict[str, Any] = None
) -> None:
    """
    Polls the engine state periodically.
    Exits and cleans up action listener on reaching a terminal state.
    """
    MONITOR_INTERVAL_SECONDS = 10
    TERMINAL_STATES = {JobState.COMPLETED, JobState.FAILED, JobState.STOPPED}
    
    print(f"[Monitor] Watching job {job_id} (GID={gid}) every {MONITOR_INTERVAL_SECONDS}s…")

    while True:
        time.sleep(MONITOR_INTERVAL_SECONDS)

        try:
            engine.sync_state(job_id, bridge)
        except Exception as e:
            print(f"[Monitor] sync_state error for {job_id}: {e}")

        current = bridge.get_job(job_id)
        if current and current.state in TERMINAL_STATES:
            print(f"[Monitor] Job {job_id} reached terminal state: {current.state.value}. Stopping monitor.")
            
            # Post-download: Auto-extract archives if requested
            if current.state == JobState.COMPLETED and job_data:
                auto_extract = job_data.get("engine_config", {}).get("auto_extract", False)
                if auto_extract:
                    _extract_archive_wrapper(job_id, bridge)
            break

    active_engines.pop(job_id, None)
    if action_listener:
        try:
            action_listener.close()
        except Exception:
            pass
    print(f"[Monitor] Job {job_id} monitor exited.")

def _extract_archive_wrapper(job_id: str, bridge: FirebaseJobBridge) -> None:
    """Attempts to find and extract the downloaded archive files."""
    rtdb_data = get_job_rtdb_data(job_id) or {}
    progress = rtdb_data.get("progress", {})
    file_path = progress.get("file_path", "")
    output_path = rtdb_data.get("output_path", "")
    
    # Extract filename or directory path
    path_to_extract = file_path if file_path else output_path
    if not path_to_extract:
        print(f"[Extract] No path information available for job {job_id}. Skipping.")
        return

    filename = os.path.basename(path_to_extract) if file_path else "downloaded files"
    
    # Notify extracting state
    update_job_progress(job_id, {
        "filename": f"📦 Extracting: {filename}",
        "percent": 100,
    })
    
    try:
        import os
        extracted = extract_archive(file_path, output_path)
        if extracted:
            update_job_progress(job_id, {
                "filename": f"✅ Extracted {len(extracted)} archive(s)",
                "percent": 100,
            })
        else:
            print(f"[Extract] No archives detected for job {job_id}.")
            # Restore original progress filename if nothing was extracted
            if progress:
                update_job_progress(job_id, progress)
    except Exception as e:
        print(f"[Extract] Failed to extract for job {job_id}: {e}")
        update_job_progress(job_id, {
            "filename": f"❌ Extraction failed: {e}",
            "percent": 100,
        })
