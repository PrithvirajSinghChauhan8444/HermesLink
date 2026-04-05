import os
import re
import requests
from urllib.parse import urlparse
from typing import Optional, Any

def _get_filename_from_headers(headers) -> Optional[str]:
    cd = headers.get('Content-Disposition', '')
    if 'filename=' in cd:
        match = re.search(r'filename="([^"]+)"', cd)
        if match: return match.group(1)
        match = re.search(r'filename=([^;]+)', cd)
        if match: return match.group(1).strip()
    return None

def _get_category_from_mime(mime: str) -> Optional[str]:
    mime = mime.lower()
    if mime.startswith('video/'): return "Videos"
    if mime.startswith('audio/'): return "Audio"
    if mime.startswith('image/'): return "Images"
    if mime.startswith('application/pdf') or mime.startswith('text/'): return "Documents"
    if mime in ['application/zip', 'application/gzip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar']:
        return "Archives"
    if mime in ['application/x-msdownload', 'application/x-apple-diskimage', 'application/vnd.android.package-archive', 'application/vnd.debian.binary-package']:
        return "Applications"
    return None

def _categorize_by_filename(filename: str) -> str:
    if not filename: return "Others"
    ext = filename.lower()
    if any(ext.endswith(e) for e in ['.exe', '.dmg', '.apk', '.deb', '.appimage', '.msi']):
        return "Applications"
    if any(ext.endswith(e) for e in ['.pdf', '.docx', '.doc', '.txt', '.csv', '.xlsx', '.epub', '.mobi']):
        return "Documents"
    if any(ext.endswith(e) for e in ['.zip', '.tar.gz', '.rar', '.7z', '.tar', '.gz', '.iso']):
        return "Archives"
    if any(ext.endswith(e) for e in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']):
        return "Images"
    if any(ext.endswith(e) for e in ['.mp4', '.mkv', '.webm', '.avi', '.mov']):
        match = re.search(r'(.*?)[ ._]+[sS](\d+)[eE](\d+)', filename)
        if match:
            series_name = match.group(1).replace('.', ' ').replace('_', ' ').strip().title()
            if series_name:
                return f"Videos/TV Shows/{series_name}/Season {int(match.group(2))}"
        return "Videos"
    if any(ext.endswith(e) for e in ['.mp3', '.wav', '.flac', '.m4a', '.aac']):
        return "Audio"
    return "Others"

def categorize_download(url: str, engine_type: str, job: Optional[Any] = None, filename: Optional[str] = None) -> str:
    """
    Categorizes the download based on engine type, url, and optional job config.
    Returns a relative category path like 'Applications', 'Media/YouTube', etc.
    """
    if engine_type == 'media':
        category = "Media/Video"
        if job and job.engine_config:
            if job.engine_config.get("format") == "audio":
                category = "Media/Audio"
        
        domain = urlparse(url).netloc.lower()
        if 'youtube.com' in domain or 'youtu.be' in domain:
            return category.replace("Media", "YouTube")
        
        return category

    if not filename:
        path = urlparse(url).path
        filename = os.path.basename(path)
    
    # Try basic extension check first
    category = _categorize_by_filename(filename)
    if category != "Others":
         return category

    # Fallback to HTTP request for mime type / content disposition
    try:
        # Use GET with stream=True as some servers block HEAD
        response = requests.get(url, stream=True, allow_redirects=True, timeout=3)
        headers = response.headers
        response.close()
        
        # Check Content-Disposition first for a real filename
        real_filename = _get_filename_from_headers(headers)
        if real_filename:
            category = _categorize_by_filename(real_filename)
            if category != "Others":
                return category
                
        # Check Content-Type
        content_type = headers.get('Content-Type', '').split(';')[0].strip()
        if content_type:
            mime_category = _get_category_from_mime(content_type)
            if mime_category: 
                return mime_category
            
    except requests.RequestException:
        pass # Silently fail and fallback to Others
        
    return "Others"
