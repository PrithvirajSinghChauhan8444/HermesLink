import requests
import os
from urllib.parse import urlparse, unquote
from .base import BaseEngine

class DirectEngine(BaseEngine):
    def __init__(self):
        self.is_cancelled = False

    def cancel(self):
        print("[DirectEngine] Cancel requested.")
        self.is_cancelled = True

    def _get_filename(self, url, response):
        # Try to get filename from Content-Disposition
        if "Content-Disposition" in response.headers:
            import re
            fname = re.findall("filename=(.+)", response.headers["Content-Disposition"])
            if fname:
                return fname[0].strip().strip('"')
        
        # Fallback to URL path
        parsed_url = urlparse(url)
        return os.path.basename(unquote(parsed_url.path)) or "downloaded_file"

    def start(self, url: str, output_path: str) -> str:
        print(f"[DirectEngine] Starting download for: {url}")
        self.is_cancelled = False
        
        try:
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                filename = self._get_filename(url, r)
                filepath = os.path.join(output_path, filename)
                
                total_size = int(r.headers.get('content-length', 0))
                downloaded_size = 0
                
                print(f"[DirectEngine] Saving to: {filepath} (Size: {total_size} bytes)")

                with open(filepath, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        if self.is_cancelled:
                            print("[DirectEngine] Download cancelled during stream.")
                            return "CANCELLED"
                        
                        if chunk:
                            f.write(chunk)
                            downloaded_size += len(chunk)
                            # Optional: Print progress? existing logging is minimal
                            
                print(f"[DirectEngine] Successfully downloaded: {filename}")
                return "COMPLETED"
                
        except Exception as e:
            if self.is_cancelled: # Double check in case exception was caused by cancellation side effects (unlikely with requests but good practice)
                return "CANCELLED"
            print(f"[DirectEngine] Error: {e}")
            return "ERROR"
