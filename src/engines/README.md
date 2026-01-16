# Engines Directory (`src/engines`)

This directory contains the implementations for different download engines.

## Files

- `base.py`: Defines the abstract base class `BaseEngine` that all engines must inherit from.
- `media.py`: Implementation of `MediaEngine` using `yt-dlp` for video/audio sites.
- `direct.py`: Implementation of `DirectEngine` using `requests` for direct HTTP/HTTPS file downloads.
- `p2p.py`: Placeholder for Peer-to-Peer engine (Torrent/Magnet).
