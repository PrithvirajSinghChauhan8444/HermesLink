# Dynamic Storage Profiles and Queue Architecture

## Overview
Currently, the download location for the HermesLink system is hardcoded in the local device agent. This limits flexibility and creates usability friction. To improve this, we are migrating to a dynamic "Storage Profiles" (or "Workspaces") system, where device owners pre-configure allowed directories, and users can assign queues to these predefined locations.

### The Proposed Flow
1. **Device Registration/Setup:** The user running the Agent on a device pre-configures "Allowed Directories" (e.g., `Movies -> /mnt/hdd1/movies`).
2. **Queue Creation:** The user creates a Queue (e.g., "High Priority Movies"). During creation, they select from the dropdown of *Allowed Directories* published by that device.
3. **Downloading:** The user selects a Device ➔ Selects a Queue ➔ (Optional) specifies a sub-folder name. The system handles the rest.

---

## Analysis

### ✅ Pros of this Approach
1. **Security (Jailing):** Prevents malicious actors or frontend bugs from passing arbitrary absolute paths (like `/etc` or `/bin`) to the download agent. By acting as a whitelist, the agent is secure by design.
2. **Massively Improved UX:** Users don't need to remember or type out complex absolute Linux/Windows paths on their phone or web interface. They just select human-readable aliases like "My External Drive".
3. **Typo Prevention:** Hand-typing paths often leads to failed downloads due to simple typos. Dropdowns eliminate this risk.
4. **Organizational Power:** Users can map specific queues to specific content types and physical drives. (e.g., a "Movies Queue" pointing to a 4TB HDD, and a "Software Queue" pointing to a fast SSD).
5. **Separation of Concerns:** The device owner dictates where files can be written, while the end-user (who might just be using the web interface) is constrained safely within those bounds.

### ⚠️ Cons & Potential Pitfalls (with Solutions)

#### 1. Con: Setup Friction & Empty States
* **Problem:** A new user installs the agent. They go to the web app to download, but they can't because they haven't set up any allowed folders or queues yet.
* **Solution:** The local agent automatically creates a "Default Workspace" (e.g., pointing to the OS's native `~/Downloads/HermesLink` folder) and a "Default Queue" using that workspace the moment it boots for the first time.

#### 2. Con: "Ghost" Directories (Disconnected Drives)
* **Problem:** A user configures a queue to download to an external drive. Later, the USB drive is unplugged. The web UI still shows the queue as valid, but downloads will fail or silently fill up the root filesystem `/`.
* **Solution:** The device Agent performs a "health check". Before starting a download, the Python agent checks if the directory exists and is writable. The agent should also periodically report the status of these directories to Firebase so the frontend can display an `Offline` status for disconnected drives.

#### 3. Con: Lack of Granularity
* **Problem:** If a folder is strictly pre-configured to `/movies`, all downloads dump into that root folder without organization (e.g., grouping by `Movies/Inception (2010)/`).
* **Solution:** Treat the pre-configured folder as a **Base Path**. When adding a link to a queue, allow an optional `Sub-directory` text input on the frontend. 
  * *Critical Security Note:* The backend Python agent **must** sanitize this sub-directory input to prevent Path Traversal attacks (e.g., filtering out `../`).

#### 4. Con: Blind to Disk Space
* **Problem:** The web UI doesn't know the physical storage limits of the remote device. A user might push a 50GB file to a queue pointing to a drive with only 5GB left.
* **Solution:** The device agent should use generic OS commands (like `shutil.disk_usage()`) to periodically publish the available space of its configured directories to Firebase. The Web UI can then display this information (e.g., `Movies HDD (450 GB Free)`).

---

## 🛠️ Architectural Suggestions for Implementation

To implement this cleanly, separate the concerns between the **Agent (Backend)** and the **Web UI (Frontend)**:

### 1. The Local Config (`config.yml` on the Agent)
The agent uses a local configuration file where the owner defines storage aliases.
```yaml
allowed_directories:
  - alias: "Default Downloads"
    path: "/home/user/Downloads"
  - alias: "Media Drive"
    path: "/mnt/storage/media"
```

### 2. State Synchronization (Firebase)
When the `test_agent.py` boots, it reads this local config and publishes it to Firebase under its device node. It should periodically update `free_space_bytes`.
```json
"devices": {
  "device_123": {
    "status": "online",
    "storage_profiles": {
      "profile_01": { 
        "alias": "Media Drive", 
        "path": "/mnt/storage/media", 
        "free_space_bytes": 1048576000 
      }
    }
  }
}
```

### 3. Queue Schema updates (Firebase)
When a queue is created via the web UI, it only saves the `profile_id` (not the absolute path), referencing the storage profile published by the device.
```json
"queues": {
  "queue_abc": {
    "name": "Movies",
    "device_id": "device_123",
    "storage_profile_id": "profile_01",
    "max_concurrent": 3
  }
}
```

### 4. Download Execution Flow
When a download payload hits the agent:
1. The agent looks at the associated queue's `storage_profile_id`.
2. It looks up the associated absolute path in its *own* local runtime configuration or Firebase device state.
3. It appends any user-defined sub-folder from the download payload.
4. It sanitizes the final path to ensure it remains within the allowed base path.
5. It sends the final secure absolute path to Aria2.
