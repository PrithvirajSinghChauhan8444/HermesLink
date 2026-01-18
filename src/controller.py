import argparse
import os
import sys

# Ensure src is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))



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

    print(f"Controller: Received {url} (Type: {download_type})")
    print(f"Target Directory: {DOWNLOAD_DIR}")

    if download_type == "media":
        from engines.media import MediaEngine
        engine = MediaEngine()
        
        import threading
        
        # Define a wrapper to run the engine in a thread
        def run_engine():
            engine.start(url, DOWNLOAD_DIR)

        t = threading.Thread(target=run_engine)
        t.start()
        
        print("Download started. Type 'stop' or press Enter to cancel.")
        
        user_cmd = input()
        if user_cmd.strip().lower() == 'stop' or user_cmd == "":
            print("Stopping download...")
            engine.cancel()
            t.join()
            print("Download process finished.")
        else:
            # If user types something else, just wait for thread? 
            # For now, let's treat any input as 'stop' or wait loop.
            # But the requirement is "option to stop".
            # If the download completes before user types 'stop', we should handle that.
            t.join() # Wait for completion if not stopped.
            
    elif download_type == "direct":
        from engines.direct import DirectEngine
        engine = DirectEngine()
        
        import threading
        def run_engine():
            engine.start(url, DOWNLOAD_DIR)

        t = threading.Thread(target=run_engine)
        t.start()
        
        print("Download started. Type 'stop' or press Enter to cancel.")
        
        user_cmd = input()
        if user_cmd.strip().lower() == 'stop' or user_cmd == "":
             print("Stopping download...")
             engine.cancel()
             t.join()
             print("Download process finished.")
        else:
             t.join()

    elif download_type == "aria2":
        from engines.aria2 import Aria2Engine
        import time
        
        engine = Aria2Engine()
        gid = engine.start(url, DOWNLOAD_DIR)
        
        if gid and gid != "ERROR" and gid != "ERROR_DAEMON_FAILED":
            print("Download started. Entering monitor loop.")
            print("Controls: [P]ause | [R]esume | [S]top | [Ctrl+C] Cancel")
            
            import msvcrt
            
            try:
                while True:
                    # Non-blocking input check
                    if msvcrt.kbhit():
                        key = msvcrt.getch().decode('utf-8').lower()
                        if key == 'p':
                            print("\n(User) Pausing...")
                            engine.pause()
                        elif key == 'r':
                            print("\n(User) Resuming...")
                            engine.resume()
                        elif key == 's':
                            print("\n(User) Stopping...")
                            engine.stop()
                            # We don't break immediately, we wait for status to become 'removed' or loop to exit naturally
                    
                    status = engine.get_status()
                    if not status:
                        # If status fails (e.g. daemon died), we might want to break or retry.
                        # For now, just print unavailable and wait.
                        # But if we stopped, status might be empty if GID is gone?
                        # Actually aria2 returns error if GID not found. aria2.py handles it by returning None.
                        # If we just stopped, it might be gone.
                        pass
                        
                    if status:
                        state = status.get("status")
                        percent, speed = engine.calculate_progress(status)
                        
                        # \r to overwrite line
                        # Padding spaces at end to clear previous longer lines
                        print(f"Status: {state:<8} | Progress: {percent:05.2f}% | Speed: {speed:<12}    ", end="\r", flush=True)
                        
                        if state == "complete":
                            print("\nDownload Completed!")
                            break
                        elif state == "error":
                            msg = status.get('errorMessage', 'Unknown Error')
                            print(f"\nDownload Error: {msg}")
                            
                            # Attempt Recovery
                            print("Attempting recovery...")
                            recovered, recover_msg = engine.recover()
                            if recovered:
                                print(f"Recovery Successful: {recover_msg}")
                                print("Restarting monitor...")
                                time.sleep(1) # Give it a moment to initialize
                                continue # Loop again with new GID
                            else:
                                print(f"Recovery Failed: {recover_msg}")
                                
                                # Interactive prompt for full restart
                                print("\nThis error is unrecoverable with the current state.")
                                choice = input("Do you want to wipe files and restart the download completely? (y/n): ").strip().lower()
                                if choice == 'y':
                                    print("Forcing full restart...")
                                    restarted, restart_msg = engine.force_restart()
                                    if restarted:
                                        print(f"Restart Successful: {restart_msg}")
                                        time.sleep(1)
                                        continue
                                    else:
                                        print(f"Restart Failed: {restart_msg}")
                                        break
                                else:
                                    print("Stopping program.")
                                    break
                        elif state == "removed":
                            print("\nDownload Removed.")
                            break
                    else:
                        # If status is None, it implies GID is invalid or connection lost.
                        # If we just sent a stop command, this is expected eventually.
                        print("\nDownload status unavailable (Finished or Removed).")
                        break

                    time.sleep(0.5)
                    
            except KeyboardInterrupt:
                print("\nUser interrupted (Ctrl+C). Stopping download...")
                engine.stop()
                print("Download stopped.")
        pass

    else:
        print(f"Engine '{download_type}' not implemented yet.")

if __name__ == "__main__":
    main()
