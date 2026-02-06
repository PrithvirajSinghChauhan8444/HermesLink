import os
import sys
import time
import json
from datetime import datetime

# Cross-platform non-blocking input
if os.name == 'nt':
    import msvcrt
else:
    import select
    import tty
    import termios

# Path Setup
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
sys.path.append(os.path.dirname(current_dir))

from core.job_manager import JobManager
from core.models import JobState

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

class Dashboard:
    def __init__(self):
        self.manager = JobManager()
        self.filter_queue = None # None = All
        self.mode = "VIEW" # VIEW, MENU
        self.refresh_rate = 2
        self.last_refresh = 0
        
        # For Linux: save original terminal settings
        if os.name != 'nt':
            self.old_settings = termios.tcgetattr(sys.stdin)

    def get_input_non_blocking(self):
        if os.name == 'nt':
            if msvcrt.kbhit():
                return msvcrt.getch().decode('utf-8').upper()
            return None
        else:
            # Linux/Unix non-blocking input
            fd = sys.stdin.fileno()
            try:
                # Set terminal to raw mode for immediate character input
                tty.setraw(fd)
                # Use select with a timeout to check for input
                rlist, _, _ = select.select([sys.stdin], [], [], 0.1)
                if rlist:
                    char = sys.stdin.read(1)
                    # Return Enter key as special value, others as uppercase
                    if char == '\r' or char == '\n':
                        return 'ENTER'
                    return char.upper() if char else None
                return None
            except Exception:
                return None
            finally:
                # Always restore terminal to original settings
                termios.tcsetattr(fd, termios.TCSADRAIN, self.old_settings)

    def draw_view(self):
        # Reload jobs
        self.manager.load_jobs()
        all_jobs = self.manager.list_jobs()
        
        # Filter
        if self.filter_queue:
            jobs = [j for j in all_jobs if j.queue_id == self.filter_queue]
            title_suffix = f"Queue: {self.filter_queue}"
        else:
            jobs = all_jobs
            title_suffix = "All Jobs"

        # Sort
        jobs.sort(key=lambda x: x.updated_at, reverse=True)

        clear_screen()
        print(f"--- HermesLink Dashboard | {title_suffix} | {datetime.now().strftime('%H:%M:%S')} ---")
        print(f"{'ID':<8} | {'Queue':<10} | {'Type':<8} | {'State':<10} | {'Progress':<8} | {'Speed':<12} | {'File/Info'}")
        print("-" * 95)

        if not jobs:
            print("No jobs found.")
        
        for job in jobs[:20]: # Limit height
            jid = job.job_id[:8]
            qid = job.queue_id
            jtype = job.engine_config.get('type', 'N/A')
            state = job.state.value
            
            progress = job.progress or {}
            percent = progress.get('percent', 0)
            speed = progress.get('speed', 'N/A')
            
            info = progress.get('filename')
            if not info:
                info = job.engine_config.get('url', '')
            
            if len(info) > 30: info = info[:27] + "..."
            
            print(f"{jid:<8} | {qid:<10} | {jtype:<8} | {state:<10} | {percent:>6.2f}% | {speed:<12} | {info}")
        
        print("-" * 95)
        print("[M] Menu | [Q] Quit")

    def show_menu(self):
        while True:
            clear_screen()
            print("--- Dashboard Menu ---")
            print("1. Show All Jobs")
            print("2. Filter by Queue")
            print("3. Back to View")
            print("Q. Quit")
            
            choice = input("Select: ").strip().lower()
            
            if choice == '1':
                self.filter_queue = None
                return
            elif choice == '2':
                print("\nAvailable Queues:")
                queues = list(self.manager.queues.keys())
                for idx, q in enumerate(queues, 1):
                    # count jobs
                    count = len([j for j in self.manager.jobs.values() if j.queue_id == q])
                    print(f"{idx}. {q} ({count} jobs)")
                
                try:
                    q_idx = int(input("Select Queue No: "))
                    if 1 <= q_idx <= len(queues):
                        self.filter_queue = queues[q_idx-1]
                        return
                    else:
                        print("Invalid selection.")
                        time.sleep(1)
                except ValueError:
                    pass
            elif choice == '3':
                return
            elif choice == 'q':
                sys.exit(0)

    def run(self):
        print("Starting Dashboard...")
        try:
            while True:
                current_time = time.time()
                
                # Check Input
                key = self.get_input_non_blocking()
                if key == 'M':
                    self.show_menu()
                elif key == 'Q':
                    print("Exiting...")
                    break
                elif key == 'ENTER':
                    # Refresh immediately on Enter
                    self.draw_view()
                    self.last_refresh = current_time
                
                # Refresh
                if current_time - self.last_refresh > self.refresh_rate:
                    self.draw_view()
                    self.last_refresh = current_time
                
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            print("\nDashboard closed.")

def main():
    dashboard = Dashboard()
    dashboard.run()

if __name__ == "__main__":
    main()
