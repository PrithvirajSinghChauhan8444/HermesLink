# 📺 Dashboard (`src/dashboard`)

> **Mission Control** 🚀

This folder contains the Terminal User Interface (TUI) code. It's how you talk to HermesLink without writing raw API calls.

---

## 🖥️ The Interface

The dashboard is built using standard Python libraries to render a clean, flicker-free status board.

- **`dashboard.py`**: The main script.
  - **View Mode**: Shows a live feed of active and queued jobs.
  - **Interactive Mode**: Press keys to Pause/Resume/Stop jobs.

## 🎮 Key Bindings

| Key     | Action                        |
| :------ | :---------------------------- |
| **M**   | Open Menu                     |
| **Q**   | Quit Dashboard                |
| **1-9** | Select Queue (in Filter Mode) |

---

> **Note**: This is a _client_. It connects to the `JobManager` (currently via direct import/shared file access, eventually via API).
