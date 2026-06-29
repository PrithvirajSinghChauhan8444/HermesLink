import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle CORS pre-flight request
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # Handle GET requests (legacy/fallback fallback)
        query = parse_qs(urlparse(self.path).query)
        url = query.get('url', [None])[0]
        self._handle_request(url, None)

    def do_POST(self):
        # Handle POST requests (recommended, receives cookies payload)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}
            
        url = body.get('url')
        cookies = body.get('cookies')
        self._handle_request(url, cookies)

    def _handle_request(self, url, cookies_text):
        if not url:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'detail': 'URL parameter is required'}).encode())
            return

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'no_playlist': True,
        }

        # Use passed cookies or fallback to environment variable cookies
        final_cookies = cookies_text or os.environ.get("YTDLP_COOKIES_TEXT")
        if final_cookies:
            try:
                temp_dir = tempfile.gettempdir()
                cookie_path = os.path.join(temp_dir, "vercel_cookies.txt")
                with open(cookie_path, "w", encoding="utf-8") as f:
                    f.write(final_cookies.strip())
                ydl_opts['cookiefile'] = cookie_path
            except Exception:
                pass

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
                            "resolution": f.get("resolution") or ("audio only" if (f.get("vcodec") or "none") == "none" else "unknown"),
                            "vcodec": f.get("vcodec") or "none",
                            "acodec": f.get("acodec") or "none",
                            "format_note": f.get("format_note"),
                            "filesize": f.get("filesize") or f.get("filesize_approx") or 0
                        } for f in formats if f.get("format_id")
                    ]
                }

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            # Fallback to YouTube oEmbed API to get title and thumbnail when offline or blocked
            if "youtube.com" in url or "youtu.be" in url:
                import urllib.request
                from urllib.parse import quote
                try:
                    oembed_url = f"https://www.youtube.com/oembed?url={quote(url)}&format=json"
                    req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=5) as response:
                        oembed_data = json.loads(response.read().decode())
                        result = {
                            "title": oembed_data.get("title", "Unknown YouTube Video"),
                            "duration": 0,
                            "thumbnail": oembed_data.get("thumbnail_url", ""),
                            "formats": [] # empty formats triggers best quality download
                        }
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps(result).encode())
                        return
                except Exception:
                    pass

            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'detail': str(e)}).encode())
