import argparse
import os
import sys
import threading
import time
import random
import msvcrt

# Ensure src and project root are in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir) # For 'engines', 'core' imports relative to src
sys.path.append(os.path.dirname(current_dir)) # For 'src.core' imports relative to root

from core.job_manager import JobManager
from core.models import JobState
from core.job_controller import JobController
from utils.url_utils import extract_urls

def add_new_download(job_manager):
    print("\n--- Add New Download ---")
    raw_input = input("Enter URL(s) to download: ").strip()
    if not raw_input:
        print("No URL provided.")
        return

    # Extract all URLs
    urls = extract_urls(raw_input)
    if not urls:
        # Fallback if no http/https found but user entered something? 
        # Or just treat raw assumption as single url if logic fails?
        # Current extract_urls returns empty if no scheme.
        # Let's assume user might paste proper links.
        # If extraction failed but text exists, maybe it's a magnet link or something not covered?
        # For now, trust the extractor or fallback to single raw input if list is empty but input wasn't.
        urls = [raw_input]

    print(f"Found {len(urls)} URL(s).")

    download_type = "direct"
    type_input = input(f"Enter type (media/p2p/direct/aria2) [default: {download_type}]: ").strip()
    if type_input:
        if type_input in ["media", "p2p", "direct", "aria2"]:
            download_type = type_input
        else:
            print(f"Invalid type '{type_input}'. Using default '{download_type}'.")

    # Hardcoded for this step (consistent with previous version)
    DOWNLOAD_DIR = r"G:\STUFF\Watch\hermeslink_test_download"
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    print(f"Target Directory: {DOWNLOAD_DIR}")

    # Create Jobs for ALL URLs
    created_jobs = []
    for url in urls:
        job = job_manager.create_job({
            "url": url,
            "type": download_type,
            "destination": DOWNLOAD_DIR
        })
        created_jobs.append(job)
        print(f"Job Queued: {job.job_id} (State: {job.state.value}) | URL: {url[:30]}...")

    # We only auto-start the UI monitor for the FIRST one for immediate feedback, 
    # OR we just return to menu because managing N downloads in this single-job-monitor view is hard.
    # The existing code went into a specific monitor loop for ONE job.
    # If we added 10 jobs, locking the user into monitoring the first one might be confusing if they want to see the list.
    
    if len(created_jobs) > 1:
        print(f"\n{len(created_jobs)} jobs have been added to the queue.")
        print("Returning to Main Menu to manage them.")
        time.sleep(1.5)
        return
    
    # If only 1 job, we can fall through to the specific monitor loop for better UX (as before)
    job = created_jobs[0]
    url = job.engine_config['url']
    
    # Select Engine (Just for the single job fall-through case)
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
    # Note: job_manager.create_job calls advance_queue(), so it might have already started!
    # We should check if it's RUNNING before calling start() again double?
    # Actually, advance_queue() calls transition_job(RUNNING). 
    # But transition_job doesn't call engine.start(). The Controller/Worker separation is a bit fuzzy here.
    # The original code called engine.start() manually.
    # So we need to do that here.
    
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

    # Monitor Loop for this specific download
    print("Controls: [S]top | [Ctrl+C] Cancel | [B]ack to Menu (Leave running)")
    
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

            # Handle Exit States (Break loop, but don't stop app)
            if state in [JobState.COMPLETED, JobState.FAILED, JobState.STOPPED]:
                print(f"\nJob ended with state: {state.value}")
                if current_job.error_reason:
                    print(f"Reason: {current_job.error_reason}")
                input("\nPress Enter to return...")
                break

            # Non-blocking input check
            if msvcrt.kbhit():
                try:
                    ch = msvcrt.getch()
                    if ch in [b'\x00', b'\xe0']:
                        msvcrt.getch()
                        key = None
                    else:
                        key = ch.decode('utf-8', errors='ignore').lower()
                except:
                    key = None

                if key == 's':
                    print("\n(User) Stopping...")
                    engine.cancel() # Or engine.stop()
                    time.sleep(1)
                elif key == 'b':
                    print("\nReturning to menu (Download continues in background)...")
                    break
            
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\nUser interrupted (Ctrl+C). Stopping download...")
        engine.cancel() if hasattr(engine, 'cancel') else engine.stop()
        time.sleep(1)

def manage_downloads(job_manager, controller):
    while True:
        # Refresh jobs
        jobs = controller.get_all_jobs_status()
        
        print("\n\n--- Manage Downloads ---")
        print(f"{'Sr':<4} | {'ID':<38} | {'State':<10} | {'Progress':<10} | {'File'}")
        print("-" * 85)
        
        if not jobs:
            print("No jobs found.")
        
        # Enumerate to get Sr No
        for idx, j in enumerate(jobs, 1):
            p = j.get('progress', {})
            perc = p.get('percent', 0)
            fname = p.get('filename', 'N/A')
            print(f"{idx:<4} | {j['job_id']:<38} | {j['state']:<10} | {perc:05.2f}%     | {fname}")

        print("\nOptions:")
        print("1. Control a Job (Enter Sr No)")
        print("2. Back to Main Menu")
        
        choice = input("Select: ").strip()
        
        if choice == '1':
            sr_input = input("Enter Sr No: ").strip()
            
            try:
                sr_no = int(sr_input)
                if 1 <= sr_no <= len(jobs):
                    selected_job = jobs[sr_no - 1]
                    job_id = selected_job['job_id']
                    print(f"Selected Job: {job_id}")
                    
                    print("Actions: PAUSE, RESUME, STOP, RETRY, RESTART")
                    action = input("Action: ").strip().upper()
                    
                    result = controller.handle_command(job_id, action)
                    print(f"Result: {result}")
                    input("Press Enter to continue...")
                else:
                    print(f"Invalid Sr No. Please enter between 1 and {len(jobs)}.")
                    input("Press Enter to continue...")
            except ValueError:
                print("Invalid input. Please enter a number.")
                input("Press Enter to continue...")
            
        elif choice == '2':
            break

def kill_switch(job_manager):
    print("\n" + "!" * 40)
    print("      CRITICAL: KILL SWITCH INITIATED      ")
    print("!" * 40)
    print("This will STOP ALL running and pending jobs.")
    
    # Generate verification code
    code = random.randint(10000, 99999)
    print(f"\nTo confirm, enter the verification code: [{code}]")
    
    user_input = input("Code: ").strip()
    
    if user_input == str(code):
        print("\nVerification SUCCESS. Stopping all jobs...")
        job_manager.stop_all_jobs()
        print("All jobs have been stopped.")
        time.sleep(2)
    else:
        print("\nVerification FAILED. Aborting.")
        time.sleep(1.5)

def main():
    # Initialize Core Systems
    job_manager = JobManager()
    controller = JobController(job_manager)
    
    print("\n===============================")
    print("   HermesLink Controller CLI   ")
    print("===============================")

    while True:
        print("\nMain Menu:")
        print("1. Manage Downloads")
        print("2. Add New Download")
        print("3. Kill Switch (Stop All)")
        print("Q. Quit")
        
        choice = input("Select: ").strip().lower()
        
        if choice == '1':
            manage_downloads(job_manager, controller)
        elif choice == '2':
            add_new_download(job_manager)
        elif choice == '3':
            kill_switch(job_manager)
        elif choice == 'q':
            print("Exiting Controller. (Background jobs may continue running depending on engine)")
            break
        else:
            print("Invalid choice.")

if __name__ == "__main__":
    main()
