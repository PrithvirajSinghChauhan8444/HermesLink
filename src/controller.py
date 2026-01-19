import argparse
import os
import sys

# Ensure src is in python path
# Ensure src and project root are in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir) # For 'engines', 'core' imports relative to src
sys.path.append(os.path.dirname(current_dir)) # For 'src.core' imports relative to root



def main():
    parser = argparse.ArgumentParser(description="HermesLink Controller")
    parser.add_argument("url", nargs="?", help="URL to download")
    parser.add_argument("--type", default="media", choices=["media", "p2p", "direct", "aria2"], help="Type of download")
    
    args = parser.parse_args()
    
    url = args.url
    download_type = args.type

    # Interactive mode if no URL provided
    if not url:
        print("--- HermesLink Interactive Mode ---")
        url = input("Enter URL to download: ").strip()
        if not url:
            print("No URL provided. Exiting.")
            return
        
        type_input = input(f"Enter type (media/p2p/direct) [default: {download_type}]: ").strip()
        if type_input:
            if type_input in ["media", "p2p", "direct", "aria2"]:
                download_type = type_input
            else:
                print(f"Invalid type '{type_input}'. Using default '{download_type}'.")

    # Hardcoded for this step
    DOWNLOAD_DIR = r"G:\STUFF\Watch\hermeslink_test_download"
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    # Initialize Job Manager
    from core.job_manager import JobManager
    from core.models import JobState
    job_manager = JobManager()

    print(f"Controller: Received {url} (Type: {download_type})")
    print(f"Target Directory: {DOWNLOAD_DIR}")

    # Create Job
    job = job_manager.create_job({
        "url": url,
        "type": download_type,
        "destination": DOWNLOAD_DIR
    })
    print(f"Job Initialized: {job.job_id} (State: {job.state.value})")


    # Select Engine
    engine = None
    needs_thread = False
    
    if download_type == "media":
        from engines.media import MediaEngine
        engine = MediaEngine()
        needs_thread = True
    elif download_type == "direct":
        from engines.direct import DirectEngine
        engine = DirectEngine()
        needs_thread = True
    elif download_type == "aria2":
        from engines.aria2 import Aria2Engine
        engine = Aria2Engine()
        needs_thread = False # Aria2 start is non-blocking
    else:
        print(f"Engine '{download_type}' not implemented yet.")
        return

    # Start Engine
    import threading
    import time
    import msvcrt
    
    if needs_thread:
        # For blocking engines (Media, Direct), run start() in a separate thread
        def run_engine():
            engine.start(job.job_id, url, DOWNLOAD_DIR, job_manager)
        
        t = threading.Thread(target=run_engine, daemon=True)
        t.start()
        print("Download started (Threaded).")
    else:
        # For non-blocking engines (Aria2), just call start()
        gid = engine.start(job.job_id, url, DOWNLOAD_DIR, job_manager)
        print(f"Download started (GID: {gid}).")

    # Unified Monitor Loop
    print("Controls: [S]top | [Ctrl+C] Cancel")
    
    try:
        while True:
            # Sync state if needed (Aria2)
            if hasattr(engine, 'sync_state'):
                engine.sync_state(job.job_id, job_manager)
            
            # Read fresh state
            current_job = job_manager.get_job(job.job_id)
            state = current_job.state
            progress = current_job.progress
            
            # UI Display
            percent = progress.get("percent", 0)
            speed = progress.get("speed", "N/A")
            filename = progress.get("filename", "")
            if len(filename) > 20: filename = filename[:17] + "..."
            
            print(f"Status: {state.value:<10} | Progress: {percent:05.2f}% | Speed: {speed:<10} | File: {filename:<20}", end="\r", flush=True)

            # Handle Exit States
            if state == JobState.COMPLETED:
                print("\nDownload Completed!")
                break
            elif state == JobState.FAILED:
                print(f"\nDownload Failed: {current_job.error_reason}")
                break
            elif state == JobState.STOPPED:
                print("\nDownload Stopped.")
                break

            # Non-blocking input check
            if msvcrt.kbhit():
                try:
                    ch = msvcrt.getch()
                    # Handle special keys (arrows, F-keys) which send 0x00 or 0xe0 first
                    if ch in [b'\x00', b'\xe0']:
                        msvcrt.getch() # Consume the second byte
                        key = None
                    else:
                        key = ch.decode('utf-8', errors='ignore').lower()
                except Exception:
                    key = None

                if key == 's':
                    print("\n(User) Stopping...")
                    engine.cancel() # Or engine.stop() depending on interface consistency
                    # Wait slightly for update
                    time.sleep(1)

            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\nUser interrupted (Ctrl+C). Stopping download...")
        engine.cancel() if hasattr(engine, 'cancel') else engine.stop()
        # Ensure final update
        time.sleep(1)
        print("Download stopped.")

if __name__ == "__main__":
    main()
