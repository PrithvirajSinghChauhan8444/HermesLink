import yt_dlp
import os
from .base import BaseEngine

class MediaEngine(BaseEngine):
    def __init__(self):
        self.is_cancelled = False

    def cancel(self):
        print("[MediaEngine] Cancel requested.")
        self.is_cancelled = True

    def _progress_hook(self, d):
        if self.is_cancelled:
            raise Exception("Download Cancelled by User")

    def start(self, url: str, output_path: str) -> str:
        print(f"[MediaEngine] Starting download for: {url}")
        
        ydl_opts = {
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'format': 'best',
            'quiet': False,
            'no_warnings': True,
            'progress_hooks': [self._progress_hook],
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Unknown')
                print(f"[MediaEngine] Successfully downloaded: {title}")
                return "COMPLETED"
        except Exception as e:
            if "Download Cancelled by User" in str(e):
                print("[MediaEngine] Download cancelled.")
                return "CANCELLED"
            print(f"[MediaEngine] Error: {e}")
            return "ERROR"
