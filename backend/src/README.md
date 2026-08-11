# 📦 Source Code (`src`)

> **Where the magic happens!** ✨

This directory contains the beating heart of **HermesLink**. Every line of Python that powers your downloads lives here.

---

## 📂 Sub-Modules

| Module                          | Description                                                               |
| :------------------------------ | :------------------------------------------------------------------------ |
| **[`core/`](./core)**           | 🧠 **The Brains**: Job management, scheduling logic, and state control.   |
| **[`engines/`](./engines)**     | 🏎️ **The Muscle**: Wrappers for Aria2, direct downloads, and media tools. |
| **[`tools/`](./tools)**         | 🔧 **The Tools**: Job classification and filename extraction helpers.      |
| **[`research/`](./research)**   | 📚 **The Library**: Research notes, plans, and feature specs.             |
| **[`utils/`](./utils)**         | 🛠️ **The Toolkit**: Browser cookie syncer and yt-dlp auth helpers.       |

---

## 🏁 Entry Points

- **`src/agent/hermes_agent.py`**: The primary launch script for the download agent daemon.
- **`src/api/server.py`**: The FastAPI server entry point.
- **`cli_working/dashboard.py`**: The interactive TUI dashboard. Run this in a terminal to inspect and control queues.
