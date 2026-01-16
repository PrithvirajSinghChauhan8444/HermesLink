import argparse
import os
import sys

# Ensure src is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from engines.media import MediaEngine

def main():
    parser = argparse.ArgumentParser(description="HermesLink Controller")
    parser.add_argument("url", nargs="?", help="URL to download")
    parser.add_argument("--type", default="media", choices=["media", "p2p", "direct"], help="Type of download")
    
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
            if type_input in ["media", "p2p", "direct"]:
                download_type = type_input
            else:
                print(f"Invalid type '{type_input}'. Using default '{download_type}'.")

    # Hardcoded for this step
    DOWNLOAD_DIR = os.path.join(os.getcwd(), "test_downloads")
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    print(f"Controller: Received {url} (Type: {download_type})")
    print(f"Target Directory: {DOWNLOAD_DIR}")

    if download_type == "media":
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

    else:
        print(f"Engine '{download_type}' not implemented yet.")

if __name__ == "__main__":
    main()
