import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        url = query.get('url', [None])[0]

        if not url:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            # Handle CORS for local dev if needed, though Vercel handles it usually
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'detail': 'URL parameter is required'}).encode())
            return

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'no_playlist': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                formats = info.get("formats", [])
                
                result = {
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration", 0),
                    "thumbnail": info.get("thumbnail", ""),
                    "formats": [
                        {
                            "format_id": f.get("format_id"),
                            "ext": f.get("ext"),
                            "resolution": f.get("resolution", "audio only" if f.get("vcodec") == "none" else "unknown"),
                            "vcodec": f.get("vcodec"),
                            "acodec": f.get("acodec"),
                            "format_note": f.get("format_note"),
                            "filesize": f.get("filesize", 0)
                        } for f in formats if f.get("format_id")
                    ]
                }

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'detail': str(e)}).encode())
