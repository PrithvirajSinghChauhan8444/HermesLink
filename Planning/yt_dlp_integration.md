# yt-dlp Integration: Current State & Future Additions

## What We Have Now
The current [YTDLPEngine](file:///home/prit/Project_Linux/Hermeslink/HermesLink/backend/src/engines/yt_dlp.py#19-173) ([backend/src/engines/yt_dlp.py](file:///home/prit/Project_Linux/Hermeslink/HermesLink/backend/src/engines/yt_dlp.py)) provides a solid foundation for downloading videos using `yt-dlp`. Features include:

1. **Basic Download Execution:**
   - Runs `yt-dlp` via `subprocess.Popen`.
   - Uses basic arguments: `--newline`, `-P <output_path>`, `-o "%(title)s.%(ext)s"`, and the targeted URL.

2. **Progress Monitoring:**
   - A dedicated monitoring thread reads stdout continuously.
   - Parses the `--newline` output using Regex to extract **download percentage** and **download speed** (`[\d\.]+%` and `[\d\.]+[KMG]?i?B/s`).
   - Captures the actual downloaded filename dynamically from the console output `[download] Destination:`.
   - Throttles progress updates to the `job_manager` (via `bridge.update_progress`) every 1.0 second to prevent overwhelming the websocket/UI.

3. **Process Control (Standard Signals):**
   - **Pause:** Uses `os.kill` with `signal.SIGSTOP`.
   - **Resume:** Uses `os.kill` with `signal.SIGCONT`.
   - **Stop/Cancel:** Uses `process.terminate()`.

4. **State Transition Syncing:**
   - Automatically handles transitions to `COMPLETED` when exit code is 0.
   - Automatically handles `FAILED` when `yt-dlp` exit code isn't 0.

---

## What We Can Add (Potential Enhancements)

Here are several powerful features we could build to take full advantage of `yt-dlp` capabilities:

### 1. Format Selection & Customization
- **Feature:** Let the user choose format quality (e.g., 4K, 1080p, 720p, Audio Only).
- **Implementation:** 
  - Add API endpoints to pre-fetch available formats (`yt-dlp -F <url>`).
  - Pass the selected format via the `-f` flag (e.g., `-f bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best`).

### 2. Audio-Only Extraction
- **Feature:** Option to download as MP3 or M4A directly.
- **Implementation:** Pass flags `--extract-audio` and `--audio-format mp3` alongside the download command.

### 3. Playlist Support & Management
- **Feature:** Allow users to download entire playlists automatically.
- **Implementation:** 
  - Add support for the `--yes-playlist` flag.
  - Parse progress for multiple items (currently it assumes a single destination filename).
  - Add indexing into output names (e.g., `-o "%(playlist_index)s - %(title)s.%(ext)s"`).

### 4. Advanced Metadata Injection
- **Feature:** Embed thumbnails, subtitles, and standard metadata into the video file.
- **Implementation:** Add flags like `--embed-thumbnail`, `--embed-subs`, and `--add-metadata`.

### 5. Authentication & Cookies (For Age-Restricted or Members-Only videos)
- **Feature:** Ability to pass cookies so the backend can download restricted content.
- **Implementation:** Users provide a `cookies.txt` or browser choice to the UI, mapped to the `--cookies` or `--cookies-from-browser` flag.

### 6. Rate Limiting Configuration
- **Feature:** Prevent network hogging by limiting max download rates per engine.
- **Implementation:** Provide an option in the UI to pass `--limit-rate <RATE>` to the subprocess.

### 7. Richer Details Before Download (The "Inspection" Phase)
- **Feature:** Show video Title, Duration, Thumbnail, and Author in the UI *before* committing to download.
- **Implementation:** Run a lightweight `yt-dlp --dump-json <url>` to retrieve metadata natively without triggering the full download.

### 8. Enhanced Progress Parsing (Time Remaining & Total Size)
- **Feature:** Display ETA and Total Video Size on the dashboard.
- **Implementation:** Expand the regex parser in `YTDLPEngine._monitor_output` to capture and pass ETA and Size from the `[download]` line.
