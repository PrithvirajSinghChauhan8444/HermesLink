import os
import sys
import time
import json
from datetime import datetime

# Path Setup
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
sys.path.append(os.path.dirname(current_dir))

from core.job_manager import JobManager
from core.models import JobState

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    manager = JobManager()
    
    print("Starting HermesLink Dashboard...")
    time.sleep(1)
    
    try:
        while True:
            # Reload jobs from disk
            manager.load_jobs()
            jobs = manager.list_jobs()
            
            # Sort by updated_at desc
            jobs.sort(key=lambda x: x.updated_at, reverse=True)
            
            clear_screen()
            print(f"--- HermesLink Dashboard ({datetime.now().strftime('%H:%M:%S')}) ---")
            print(f"{'ID':<8} | {'Type':<8} | {'State':<10} | {'Progress':<8} | {'Speed':<12} | {'File/Info'}")
            print("-" * 80)
            
            if not jobs:
                print("No jobs found.")
            
            for job in jobs:
                jid = job.job_id[:8]
                jtype = job.engine_config.get('type', 'N/A')
                state = job.state.value
                
                progress = job.progress or {}
                percent = progress.get('percent', 0)
                speed = progress.get('speed', 'N/A')
                
                # Filename or URL if filename missing
                info = progress.get('filename')
                if not info:
                    info = job.engine_config.get('url', '')
                    if len(info) > 30: info = info[:27] + "..."
                else:
                    if len(info) > 30: info = info[:27] + "..."
                
                # ANSI Colors (simple implementation)
                status_color = ""
                if state == "RUNNING": status_color = " [32m" # Green
                elif state == "FAILED": status_color = " [31m" # Red
                elif state == "COMPLETED": status_color = " [34m" # Blue
                reset_color = " [0m"
                
                # Actually, Windows CMD might not support ANSI by default depending on version.
                # Let's keep it clean without colors for maximum compatibility unless requested.
                
                print(f"{jid:<8} | {jtype:<8} | {state:<10} | {percent:>6.2f}% | {speed:<12} | {info}")
                
            print("-" * 80)
            print("Press Ctrl+C to exit dashboard.")
            
            time.sleep(3)
            
    except KeyboardInterrupt:
        print("\nDashboard closed.")

if __name__ == "__main__":
    main()
