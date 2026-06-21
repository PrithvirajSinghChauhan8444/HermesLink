<div align="center">
  <img src="docs/images/landing.gif" width="720" alt="HermesLink Banner" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
  
  # ⚡ HermesLink

  ### *A Distributed, Real-Time Remote Download Manager*
  
  Submit downloads from any device, anywhere. Execute them securely on your private download boxes.
  
  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white&style=flat-square)](https://www.python.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
  [![Firebase](https://img.shields.io/badge/Firebase-RTDB%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black&style=flat-square)](https://firebase.google.com/)
  [![Aria2](https://img.shields.io/badge/Aria2-Engine-green?logo=git&logoColor=white&style=flat-square)](https://aria2.github.io/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
</div>

---

## 📌 Overview

HermesLink decouples **download scheduling (intent)** from **file downloading (execution)**. Using a real-time web dashboard, you can trigger a download from your phone or laptop on the go, which immediately executes on your home server, office machine, or private server cluster running the HermesLink background agent.

```
┌──────────────────┐      ┌─────────────────┐      ┌───────────────┐      ┌─────────────┐
│  You (Dashboard) │ ───> │ Firebase Cloud  │ ───> │ Device Agent  │ ───> │ Local File  │
│  (Phone/Laptop)  │      │  (Firestore/DB) │      │ (Home Server) │      │ Storage     │
└──────────────────┘      └─────────────────┘      └───────────────┘      └─────────────┘
```

### Key Use Cases
* **Remote Scheduling:** Start large downloads on your home server while you are away.
* **Centralized Coordination:** Monitor and control download queues across multiple hosts in one interface.
* **Smart Organization:** Automatically sort and organize downloads based on file type and name rules.

---

## 🖼️ Media & Previews

<details open>
  <summary><b>📷 Screenshots</b></summary>
  <br>

  <p align="center">
    <img src="docs/images/active_download.png" width="700" alt="Active Downloads" style="border-radius: 6px; border: 1px solid #ddd;" />
    <br><em>Real-time active downloads monitoring with progress updates</em>
  </p>

  <p align="center">
    <img src="docs/images/add_download.png" width="700" alt="Add Download Modal" style="border-radius: 6px; border: 1px solid #ddd;" />
    <br><em>New job dialog — customize target device, queue, and storage location</em>
  </p>

  <p align="center">
    <img src="docs/images/history.png" width="700" alt="Download History" style="border-radius: 6px; border: 1px solid #ddd;" />
    <br><em>Comprehensive download history log with statuses</em>
  </p>
</details>

<details>
  <summary><b>🎬 Walkthrough Videos</b></summary>
  <br>

  * **System Overview & Walkthrough:**
    ![HermesLink Walkthrough](docs/videos/walkthrough.mp4)

  * **Setup & Configurations Tutorial:**
    ![HermesLink Tutorial](docs/videos/tutorial.mp4)
</details>

---

## ✨ Features

### 📡 Real-Time Device Discovery
* **Instant Presence:** Agents register in Firebase Realtime Database (`presence/{device_id}`) detailing status, platform, and storage config.
* **Active Keepalive:** Heartbeat updates run every 30 seconds to track live status; automatic `"offline"` transition on clean shutdown.

### 🔄 Distributed Job System
* **Event-Driven Dispatch:** Jobs are stored in **Firestore** and fetched by target agents using Firestore listeners (zero idle polling, instant triggers).
* **Network Efficiency:** Active progress stats stream to **RTDB** to prevent Firestore write-quota exhaustion, while terminal states (`COMPLETED`, `FAILED`, `STOPPED`) sync to **Firestore** for persistent records.
* **Instant Controls:** Pause, resume, stop, and retry actions execute in sub-second latency via RTDB control nodes.

### ⚙️ Pluggable Download Engines
HermesLink utilizes a robust interface (`BaseEngine`) for handling downloads:
* **Aria2 Daemon:** High-performance multi-connection engine. Supports pausing/resuming, automatic single-thread fallback on errors, and partial file cleanup.
* **yt-dlp Engine:** Specialized handler for YouTube and streaming media platforms, featuring dynamic format selection and process command signaling.
* **Direct HTTP:** Lightweight streaming downloader for straightforward HTTP/HTTPS file URLs.

### 🧠 Smart Features & Organization
* **AI-Powered File Sorting:** Categorizes completed files (Applications, Archives, Media, Documents, etc.) based on type, routing them into clean subdirectories.
* **Auto-Extraction:** Optional extraction of compressed archives (`.zip`, `.tar`, `.gz`) post-download.
* **Custom Queues:** Define parallel execution limits (`max_parallel_jobs`), thread counts (`max_threads_per_job`), and priority levels in Firestore.
* **Zombie Job Sweeper:** Auto-sweeper cleans up stuck `RUNNING` tasks if an agent drops offline unexpectedly.

---

## 🛠️ Tech Stack

| Layer | Component | Notes |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, GSAP, TailwindCSS | High-performance dashboard with smooth transitions |
| **Backend Agent** | Python 3.10+, Firebase Admin SDK | Cross-platform Python execution |
| **Database** | Firebase Firestore & Realtime DB | Hybrid storage architecture (persistent + live-state) |
| **Auth** | Firebase Authentication | Admin login restrictions |
| **API Server** | FastAPI, Uvicorn | REST APIs for automation triggers |

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Python 3.10+**
* **Node.js 18+**
* **aria2** installed and available in system `PATH`
* **yt-dlp** installed and available in system `PATH` (optional, for video sites)
* A **Firebase Project**

---

### 🔧 1. Firebase Setup

1. **Create Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and register a new project.
2. **Enable Firestore Database:** Enable Firestore under Build. You can choose **Test Mode** during initialization.
3. **Enable Realtime Database:** Create a Realtime Database instance in your preferred region. Note the database URL.
4. **Enable Email/Password Authentication:** Enable the Email/Password sign-in method. Add a user account to serve as your administrator.
5. **Get App Configurations:** Register a Web App (`</>`) in Project Settings and copy the configuration keys.
6. **Generate Service Account Keys:** Go to **Project Settings** → **Service accounts**, click **Generate new private key**, and save the resulting JSON file as `backend/serviceAccountKey.json`.
7. **Seed default Queue:**
   Create a collection in Firestore named `queues`. Add a document with ID `default` containing:
   - `name`: `"Default"` (string)
   - `max_parallel_jobs`: `2` (number)
   - `max_threads_per_job`: `4` (number)
   - `priority`: `10` (number)
   - `enabled`: `true` (boolean)
   - `updated_on`: `"22-06-2026"` (string)

---

### 💻 2. Configuration Files

#### Backend Environment Configuration
Create `backend/.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
FIREBASE_DATABASE_URL=https://<your-project-id>-default-rtdb.firebaseio.com
```

Create `backend/config.yaml` to specify storage folders:
```yaml
device_name: "Home Media Server"
storage_profiles:
  default:
    name: "Default Downloads"
    paths:
      - "~/Downloads/HermesLink"
  movies:
    name: "Movies"
    paths:
      - "/mnt/media/Movies"
```

#### Frontend Environment Configuration
Create `frontend/HermesLink_frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_DATABASE_URL=https://<your-project-id>-default-rtdb.firebaseio.com
```

---

### 🏃 3. Run Applications

#### Backend Agent Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run the agent worker
cd src
python agent.py
```

#### Frontend Dashboard Setup
```bash
cd frontend/HermesLink_frontend
npm install
npm run dev
```

---

## 🖥️ Production Daemon Setup (Linux / systemd)

For running HermesLink as a background service on Linux (e.g., Arch, Debian), you can configure systemd user services.

### 1. Link Control CLI
Link the provided control script to your local bin:
```bash
mkdir -p ~/.local/bin
ln -s "$(pwd)/hermeslink-ctl.sh" ~/.local/bin/hermeslink

# Reload user daemon configuration
systemctl --user daemon-reload
```

### 2. Configure Service Units
Create user service definitions under `~/.config/systemd/user/`:

#### `~/.config/systemd/user/hermeslink-agent.service`
```ini
[Unit]
Description=HermesLink Background Agent
After=network.target

[Service]
Type=simple
Environment="PYTHONUNBUFFERED=1"
WorkingDirectory=/absolute/path/to/HermesLink/backend/src
ExecStart=/absolute/path/to/HermesLink/backend/.venv/bin/python agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

#### `~/.config/systemd/user/hermeslink-api.service`
```ini
[Unit]
Description=HermesLink API Server
After=network.target

[Service]
Type=simple
Environment="PYTHONUNBUFFERED=1"
WorkingDirectory=/absolute/path/to/HermesLink/backend/src
ExecStart=/absolute/path/to/HermesLink/backend/.venv/bin/python api_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

### 3. Service Commands
You can now manage backend processes using the `hermeslink` utility:
* **Start Services:** `hermeslink start`
* **Stop Services:** `hermeslink stop`
* **Restart Services:** `hermeslink restart`
* **Check Status:** `hermeslink status`
* **Follow Logs:** `hermeslink logs`
* **Enable Boot Autostart:** `hermeslink enable`

---

## 📂 Codebase Directory Layout

```
HermesLink/
├── backend/
│   ├── config.yaml              # Local storage profile paths
│   └── src/
│       ├── agent.py             # Main background agent daemon
│       ├── api_server.py        # FastAPI endpoints controller
│       ├── core/
│       │   ├── models.py        # Structural data representations
│       │   ├── job_manager.py   # Job state operations
│       │   ├── job_runner.py    # Main task loops
│       │   ├── classifier.py    # Auto-categorization engine
│       │   ├── zombie_sweeper.py# Disconnected worker task cleanup
│       │   └── firebase_config.py
│       └── engines/
│           ├── base.py          # Abstract download driver
│           ├── aria2.py         # aria2 RPC engine handler
│           ├── direct.py        # Native HTTP downloader
│           └── media.py         # yt-dlp downloader
├── frontend/
│   └── HermesLink_frontend/     # React Dashboard (Vite)
│       └── src/
│           ├── hooks/           # Real-time state listeners
│           ├── components/      # UI components & sections
│           └── config/          # Firebase initialization
├── firestore.rules              # Firestore authorization configurations
└── database.rules.json          # RTDB action validation limits
```

---

## 📄 License
This project is licensed under the terms of the MIT License.
