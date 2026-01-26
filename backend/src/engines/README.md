# 🏎️ Download Engines (`src/engines`)

> **Gotta Go Fast!** ⚡

This directory contains the drivers that actually fetch data from the internet. HermesLink supports multiple engines to handle different protocols.

---

## 🔧 Supported Engines

### 1. **Aria2** (`aria2.py`) 🌪️

- **Best For**: Heavy lifting, HTTP, FTP, Magnet links, BitTorrent.
- **Features**: Multi-connection downloads, pausing/resuming, high stability.

### 2. **Direct** (`direct.py`) 💾

- **Best For**: Simple, small files via HTTP/HTTPS.
- **Tech**: Uses Python's native `requests` stream. Good for lightweight tasks.

### 3. **Media** (`media.py`) 📺

- **Best For**: Video/Audio sites (YouTube, standard media).
- **Tech**: Wraps `yt-dlp` (or similar) to extract media from complex pages.

### 4. **P2P** (`p2p.py`) 🕸️

- **Best For**: Decentralized transfers.
- _(Experimental / In Progress)_

---

## 🏗️ Adding a New Engine

Implement the `BaseEngine` interface in `base.py`. You need to define methods for `start`, `stop`, `pause`, and `resume`.
