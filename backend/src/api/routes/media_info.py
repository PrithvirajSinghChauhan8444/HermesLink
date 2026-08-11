import requests
import json
import urllib.request
import subprocess
import os
import sys
from urllib.parse import quote, urlparse
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import get_current_user
from tools.name_extractor import resolve_filename as shared_resolve_filename
from utils.ytdlp_auth import get_auth_args

router = APIRouter(prefix="/api", tags=["Media Info"])

@router.get("/resolve-filename")
def resolve_filename(url: str, user: dict = Depends(get_current_user)) -> Dict[str, str]:
    """Fetch filename from a URL using head request / content-disposition."""
    try:
        filename = shared_resolve_filename(url)
        return {"filename": filename}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/yt-dlp/info")
def get_yt_dlp_info(url: str, user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Fetch video metadata and available formats using yt-dlp."""
    cmd = [sys.executable, "-m", "yt_dlp", "--dump-json", "--no-playlist", "--no-warnings"]
    cmd.extend(get_auth_args())
    cmd.append(url)
    
    try:
        process = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        data = json.loads(process.stdout)
        formats = data.get("formats", [])
        return {
            "title": data.get("title", "Unknown"),
            "duration": data.get("duration", 0),
            "thumbnail": data.get("thumbnail", ""),
            "formats": [
                {
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "resolution": f.get("resolution") or ("audio only" if (f.get("vcodec") or "none") == "none" else "unknown"),
                    "vcodec": f.get("vcodec") or "none",
                    "acodec": f.get("acodec") or "none",
                    "format_note": f.get("format_note"),
                    "filesize": f.get("filesize") or f.get("filesize_approx") or 0
                } for f in formats if f.get("format_id")
            ]
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"yt-dlp error: {e.stderr}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse yt-dlp output")
