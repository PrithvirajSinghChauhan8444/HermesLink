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
from core.job_runner import JobRunner
from utils.url_utils import extract_urls


def manage_queues(job_manager):
    while True:
        print("\n\n--- Manage Queues ---")
        print(f"{'Queue ID':<15} | {'Max Jobs':<8} | {'Threads':<8} | {'Priority':<8} | {'Pending':<8} | {'Active'}")
        print("-" * 80)
        
        # Gather data
        for qid, config in job_manager.configs.items():
            q_state = job_manager.queues.get(qid)
            pending_count = len(q_state.job_ids) if q_state else 0
            
            # Count active jobs in this queue
            active_count = 0
            for jid in job_manager.jobs:
                job = job_manager.jobs[jid]
                if job.queue_id == qid and job.state == JobState.RUNNING:
                    active_count += 1
            
            print(f"{qid:<15} | {config.max_parallel_jobs:<8} | {config.max_threads_per_job:<8} | {config.priority:<8} | {pending_count:<8} | {active_count}")

        print("\nOptions:")
        print("1. Create New Queue")
        print("2. Delete Queue")
        print("3. Back to Main Menu")
        
        choice = input("Select: ").strip()
        
        if choice == '1':
            new_qid = input("Enter New Queue ID: ").strip()
            if not new_qid: continue
            if new_qid in job_manager.queues:
                print("Queue already exists.")
                continue
                
            try:
                max_j = int(input("Max Parallel Jobs (default 1): ") or 1)
                threads = int(input("Max Threads per Job (default 4): ") or 4)
                prio = int(input("Priority (default 10): ") or 10)
                
                job_manager.create_queue(new_qid, config={
                    "max_parallel_jobs": max_j,
                    "max_threads_per_job": threads,
                    "priority": prio
                })
                print(f"Queue '{new_qid}' created.")
            except ValueError:
                print("Invalid input.")
        
        elif choice == '2':
            del_qid = input("Enter Queue ID to delete: ").strip()
            if del_qid == "default":
                print("Cannot delete default queue.")
                continue
            
            try:
                job_manager.delete_queue(del_qid)
                print(f"Queue '{del_qid}' deleted.")
            except Exception as e:
                print(f"Error: {e}")
                
        elif choice == '3':
            break

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
        urls = [raw_input]

    print(f"Found {len(urls)} URL(s).")

    download_type = "direct"
    type_input = input(f"Enter type (media/p2p/direct/aria2) [default: {download_type}]: ").strip()
    if type_input:
        if type_input in ["media", "p2p", "direct", "aria2"]:
            download_type = type_input
        else:
            print(f"Invalid type '{type_input}'. Using default '{download_type}'.")

    # Queue Selection
    print("\nSelect Queue:")
    queues = list(job_manager.configs.values())
    for idx, cfg in enumerate(queues, 1):
        print(f"{idx}. {cfg.queue_id} (Max Jobs: {cfg.max_parallel_jobs}, Threads: {cfg.max_threads_per_job})")
    print(f"{len(queues) + 1}. Create New Queue")
    
    q_choice = input("Select [default: 1]: ").strip()
    selected_queue_id = "default"
    
    if not q_choice:
        selected_queue_id = queues[0].queue_id
    else:
        try:
            choice_idx = int(q_choice)
            if 1 <= choice_idx <= len(queues):
                selected_queue_id = queues[choice_idx - 1].queue_id
            elif choice_idx == len(queues) + 1:
                # Create New
                new_qid = input("Enter New Queue ID: ").strip()
                if new_qid and new_qid not in job_manager.queues:
                    try:
                        max_j = int(input("Max Parallel Jobs (default 1): ") or 1)
                        threads = int(input("Max Threads per Job (default 4): ") or 4)
                        prio = int(input("Priority (default 10): ") or 10)
                        job_manager.create_queue(new_qid, config={
                            "max_parallel_jobs": max_j,
                            "max_threads_per_job": threads,
                            "priority": prio
                        })
                        selected_queue_id = new_qid
                        print(f"Queue '{new_qid}' created and selected.")
                    except ValueError:
                        print("Invalid input. Using default queue.")
                        selected_queue_id = "default"
                else:
                    print("Invalid ID or already exists. Using default queue.")
                    selected_queue_id = "default"
            else:
                print("Invalid choice. Using default queue.")
        except ValueError:
             print("Invalid input. Using default queue.")

    # Hardcoded for this step (consistent with previous version)
    DOWNLOAD_DIR = r"G:\STUFF\Watch\hermeslink_test_download"
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    print(f"Target Directory: {DOWNLOAD_DIR}")
    print(f"Target Queue: {selected_queue_id}")

    # Create Jobs for ALL URLs
    created_jobs = []
    for url in urls:
        # Pass queue_id to create_job
        job = job_manager.create_job({
            "url": url,
            "type": download_type,
            "destination": DOWNLOAD_DIR
        }, queue_id=selected_queue_id)
        
        created_jobs.append(job)
        print(f"Job Queued: {job.job_id} (State: {job.state.value}) | URL: {url[:30]}...")

    print(f"\n{len(created_jobs)} jobs have been added to the queue '{selected_queue_id}'.")
    print("The Job Runner running in the background will start them automatically.")
    input("\nPress Enter to return to Main Menu...")

def manage_downloads(job_manager, controller):
    while True:
        # Refresh jobs
        jobs = controller.get_all_jobs_status()
        
        print("\n\n--- Manage Downloads ---")
        print(f"{'Sr':<4} | {'ID':<38} | {'Queue':<10} | {'State':<10} | {'Progress':<10} | {'File'}")
        print("-" * 95)
        
        if not jobs:
            print("No jobs found.")
        
        # Enumerate to get Sr No
        ordered_jobs = []
        
        for idx, j in enumerate(jobs, 1):
            p = j.get('progress', {})
            perc = p.get('percent', 0)
            fname = p.get('filename', 'N/A')
            qid = j.get('queue_id', 'default')
            # Truncate filename
            if len(fname) > 30: fname = fname[:27] + "..."
            
            print(f"{idx:<4} | {j['job_id']:<38} | {qid:<10} | {j['state']:<10} | {perc:05.2f}%     | {fname}")
            ordered_jobs.append(j)

        print("\nOptions:")
        print("1. Control a Job (Enter Sr No)")
        print("2. Refresh List")
        print("3. Back to Main Menu")
        
        choice = input("Select: ").strip()
        
        if choice == '1':
            sr_input = input("Enter Sr No: ").strip()
            
            try:
                sr_no = int(sr_input)
                if 1 <= sr_no <= len(ordered_jobs):
                    selected_job = ordered_jobs[sr_no - 1]
                    job_id = selected_job['job_id']
                    print(f"Selected Job: {job_id}")
                    
                    print("Actions: PAUSE, RESUME, STOP, RETRY, RESTART")
                    action = input("Action: ").strip().upper()
                    
                    result = controller.handle_command(job_id, action)
                    print(f"Result: {result}")
                    input("Press Enter to continue...")
                else:
                    print(f"Invalid Sr No. Please enter between 1 and {len(ordered_jobs)}.")
                    input("Press Enter to continue...")
            except ValueError:
                print("Invalid input. Please enter a number.")
                input("Press Enter to continue...")
        
        elif choice == '2':
            continue # Loop restarts, refreshing list
            
        elif choice == '3':
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
    
    # Initialize and Start Job Runner
    runner = JobRunner(job_manager)
    runner.start()
    
    print("\n===============================")
    print("   HermesLink Controller CLI   ")
    print("===============================")

    try:
        while True:
            # Optional: Show active job summary in main menu
            active_job = job_manager.get_active_job()
            status_line = f"Active: {active_job.job_id[:8]}..." if active_job else "Active: None"
            
            print("\nMain Menu:")
            print(f"Status: {status_line}")
            print("1. Manage Downloads")
            print("2. Add New Download")
            print("3. Manage Queues")
            print("4. Kill Switch (Stop All)")
            print("Q. Quit")
            
            choice = input("Select: ").strip().lower()
            
            if choice == '1':
                manage_downloads(job_manager, controller)
            elif choice == '2':
                add_new_download(job_manager)
            elif choice == '3':
                manage_queues(job_manager)
            elif choice == '4':
                kill_switch(job_manager)
            elif choice == 'q':
                print("Exiting Controller...")
                runner.stop()
                break
            else:
                print("Invalid choice.")
    except KeyboardInterrupt:
        print("\nForce Exit.")
        runner.stop()

if __name__ == "__main__":
    main()
