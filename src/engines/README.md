# Engines Directory (`src/engines`)

This directory contains the implementations for different download engines.

## Files

- `base.py`: Defines the abstract base class `BaseEngine` that all engines must inherit from.
- `media.py`: Implementation of `MediaEngine` using `yt-dlp` for video/audio sites.
- `direct.py`: Implementation of `DirectEngine` using `requests` for direct HTTP/HTTPS file downloads.
- `p2p.py`: Placeholder for Peer-to-Peer engine (Torrent/Magnet). Currently empty.
- `aria2.py`: **[NEW]** Implementation of `Aria2Engine` wrapping the `aria2c` daemon.
  - **Auto-Start**: Automatically launches `aria2c` process if not running.
  - **Error-Aware**: Detects "Resume Not Supported" errors and auto-downgrades settings.
  - **Force Restart**: Supports cleaning up corrupted files and restarting from scratch.
