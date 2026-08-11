import os
import re
import urllib.request
import json
import requests
from urllib.parse import quote, urlparse
from typing import Optional, Any

def _get_filename_from_headers(headers: Any) -> Optional[str]:
    """Extract filename from Content-Disposition header."""
    content_disposition = headers.get('Content-Disposition', '')
    if 'filename=' in content_disposition:
        match = re.search(r'filename="([^"]+)"', content_disposition)
        if match: 
            return match.group(1)
        match = re.search(r'filename=([^;]+)', content_disposition)
        if match: 
            return match.group(1).strip()
    return None

def resolve_filename(url: str) -> str:
    """
    Fetch filename from a URL.
    Attempts YouTube oEmbed first, then HTTP HEAD/GET content-disposition, 
    and falls back to URL path basename.
    """
    # 1. Direct oEmbed check for YouTube videos
    if "youtube.com" in url.lower() or "youtu.be" in url.lower():
        try:
            oembed_url = f"https://www.youtube.com/oembed?url={quote(url)}&format=json"
            request_handle = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request_handle, timeout=3) as response:
                oembed_data = json.loads(response.read().decode())
                title = oembed_data.get("title")
                if title:
                    return title
        except Exception:
            pass

    try:
        headers = {}
        try:
            response = requests.head(url, allow_redirects=True, timeout=3)
            headers = response.headers
        except Exception:
            pass
            
        content_disposition = headers.get('Content-Disposition') if headers else None
        if not content_disposition:
            try:
                response = requests.get(url, stream=True, allow_redirects=True, timeout=3)
                headers = response.headers
                response.close()
            except Exception:
                pass
        
        filename = _get_filename_from_headers(headers) if headers else None
            
        if not filename:
            path = urlparse(url).path
            filename = os.path.basename(path)
            
        if not filename:
            filename = "download"
            
        return filename
    except Exception:
        try:
            path = urlparse(url).path
            filename = os.path.basename(path) or "download"
            return filename
        except Exception:
            return "download"
