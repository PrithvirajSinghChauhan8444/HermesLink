# HermesLink —  Architecture Summary

## 1. Project Goal
HermesLink is a **distributed download manager** where users:
- Log in via a **web dashboard**
- Select a **specific device**
- Start downloads that **execute on that device**
- Monitor progress centrally

---

## 2. Core Principles
- **Verify users, not devices**
- **Execution happens only where an agent runs**
- **UI never executes downloads**
- **Server is the source of truth**

---

## 3. High-Level Architecture

Web Dashboard
↓
Main Server (API + DB + Controller)
↓
Device Agents (Execution)



---

## 4. Components

### Web Dashboard
- Login & auth
- List available devices
- Submit download jobs
- View status & history

### Main Server
- Stores users, devices, jobs
- Validates permissions
- Assigns jobs to devices
- Tracks progress & results

### Device Agent (per device)
- Runs in background
- Registers device
- Maintains connection to server
- Executes downloads locally
- Sends progress updates

---

## 5. Device Registration
- Agent authenticates user
- Registers device with server
- Sends heartbeat
- Server marks device ONLINE/OFFLINE
- UI shows availability

---

## 6. Job Submission Flow
1. User selects URL, type, device
2. Server creates job (`QUEUED`)
3. Job is tagged with `device_id`
4. No execution yet

---

## 7. How Devices Get Jobs

### Option A — Polling (Simple & Reliable)
- Agent periodically asks server for jobs
- Server returns job if available
- NAT/firewall safe

### Option B — Persistent Connection (Like Gmail/WhatsApp)
- Agent opens long-lived connection
- Server pushes jobs on that connection
- More complex, better UX

> Pure webhooks are **not reliable** for devices behind NAT.

---

## 8. Execution on Device
- Agent receives job
- Runs engine (yt-dlp / aria2 / torrent)
- Saves files locally
- Reports progress & completion

---

## 9. Notifications
- UI polls or subscribes for updates
- Event-based notifications only
- Telegram optional; not required

---

## 10. Platform Choices

### Vercel
- ✅ Web UI & auth
- ❌ No long-running jobs
- ❌ No download engines

### Execution
- VPS / Home server / PC
- Runs main server and/or agents

---

## 11. Key Rules
- Server never connects into devices
- Devices always connect out
- Agents are mandatory for execution
- Chat apps ≠ dashboards

---

## 12. Mental Model
> **Server assigns jobs → devices pull/receive → agents execute locally.**

---

## 13. Recommended Build Order
1. Main server + DB
2. Job & device models
3. Polling-based agent
4. Web dashboard
5. Persistent connection upgrade (optional)
6. Notifications & polish