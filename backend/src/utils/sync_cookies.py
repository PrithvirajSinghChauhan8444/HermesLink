import os
import sys

# Ensure src is in python path
this_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.abspath(os.path.join(this_dir, ".."))
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

# Load env variables from backend/.env
backend_dir = os.path.abspath(os.path.join(src_dir, ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from core.firebase_config import initialize_firebase, get_db

def main():
    try:
        import browser_cookie3
    except ImportError:
        print("[Error] browser-cookie3 package is not installed.")
        print("Please install it in your environment: pip install browser-cookie3")
        sys.exit(1)

    print("Extracting YouTube cookies from local browser...")
    try:
        # Load cookies from all browsers or target a specific one (e.g. firefox/chrome)
        # We start by trying Firefox, then Chrome, then Brave, then falling back to all
        cj = None
        try:
            cj = browser_cookie3.firefox(domain_name='youtube.com')
            print("Successfully extracted cookies from Firefox.")
        except Exception:
            try:
                cj = browser_cookie3.chrome(domain_name='youtube.com')
                print("Successfully extracted cookies from Chrome.")
            except Exception:
                try:
                    cj = browser_cookie3.brave(domain_name='youtube.com')
                    print("Successfully extracted cookies from Brave.")
                except Exception:
                    try:
                        cj = browser_cookie3.load(domain_name='youtube.com')
                        print("Successfully extracted cookies from default browser.")
                    except Exception as e:
                        print(f"Failed to load cookies from any browser: {e}")
                        sys.exit(1)
        
        # Format the cookies into Netscape standard format
        lines = ["# Netscape HTTP Cookie File"]
        for cookie in cj:
            if "youtube.com" in cookie.domain:
                # flag is TRUE if domain starts with . else FALSE
                flag = "TRUE" if cookie.domain.startswith(".") else "FALSE"
                secure = "TRUE" if cookie.secure else "FALSE"
                expires = str(cookie.expires) if cookie.expires else "0"
                lines.append(
                    f"{cookie.domain}\t{flag}\t{cookie.path}\t{secure}\t{expires}\t{cookie.name}\t{cookie.value}"
                )
        
        cookies_text = "\n".join(lines)
        if len(lines) <= 1:
            print("No YouTube cookies found. Are you logged into YouTube in your browser?")
            sys.exit(1)

        print(f"Extracted {len(lines) - 1} YouTube cookies. Syncing to Firestore...")

        # Initialize Firebase
        # Resolve absolute path to serviceAccountKey.json if configured in .env
        private_key_path = os.getenv("FIREBASE_PRIVATE_KEY_PATH")
        if private_key_path and not os.path.isabs(private_key_path):
            os.environ["FIREBASE_PRIVATE_KEY_PATH"] = os.path.join(backend_dir, private_key_path)

        initialize_firebase()
        db = get_db()

        # Update the cookies collection in Firestore
        db.collection('cookies').document('youtube').set({
            'cookies_text': cookies_text,
            'updated_at': os.popen('date -Iseconds').read().strip() # timestamp string
        })

        print("YouTube cookies synchronized to Firestore successfully!")

    except Exception as e:
        print(f"An error occurred during cookie sync: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
