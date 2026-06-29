import os
import tempfile
from typing import Optional, List

def get_cookies_path() -> Optional[str]:
    """
    Looks for a cookies.txt file or content in environment variables:
    1. YTDLP_COOKIES_TEXT environment variable (saves content to a temporary file).
    2. Current working directory.
    3. The backend/ directory.
    4. The project root directory.
    """
    # 1. Check for cookies content in environment variable (useful for cloud/Vercel)
    cookies_text = os.getenv("YTDLP_COOKIES_TEXT")
    if cookies_text:
        try:
            temp_dir = tempfile.gettempdir()
            temp_cookies_path = os.path.join(temp_dir, "hermeslink_cookies.txt")
            with open(temp_cookies_path, "w", encoding="utf-8") as f:
                f.write(cookies_text.strip())
            return temp_cookies_path
        except Exception as e:
            print(f"[YTDLP Utils] Failed to write temp cookies file from env: {e}")

    # 2. Check current working directory
    cwd_cookies = os.path.join(os.getcwd(), "cookies.txt")
    if os.path.exists(cwd_cookies):
        return cwd_cookies

    # 3. Check backend directory
    # This file is in backend/src/utils/ytdlp_utils.py
    this_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.abspath(os.path.join(this_dir, "..", ".."))
    backend_cookies = os.path.join(backend_dir, "cookies.txt")
    if os.path.exists(backend_cookies):
        return backend_cookies

    # 4. Check project root directory
    project_root = os.path.abspath(os.path.join(backend_dir, ".."))
    root_cookies = os.path.join(project_root, "cookies.txt")
    if os.path.exists(root_cookies):
        return root_cookies

    return None

def get_auth_args() -> List[str]:
    """
    Returns the authentication arguments for yt-dlp.
    1. If YTDLP_USE_OAUTH is enabled, returns ['--username', 'oauth', '--password', ''].
    2. If YTDLP_COOKIES_BROWSER is set, returns ['--cookies-from-browser', browser].
    3. If cookies.txt is found, returns ['--cookies', path].
    """
    # Force dotenv reload in case env changed since server startup
    from dotenv import load_dotenv
    load_dotenv()
    
    if os.getenv("YTDLP_USE_OAUTH", "").lower() == "true":
        return ["--username", "oauth", "--password", ""]
        
    browser = os.getenv("YTDLP_COOKIES_BROWSER")
    if browser:
        return ["--cookies-from-browser", browser]
        
    cookie_path = get_cookies_path()
    if cookie_path:
        return ["--cookies", cookie_path]
        
    return []
