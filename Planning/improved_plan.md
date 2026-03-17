# 🧠 CURRENT STATE (Your System)

- ✔ Frontend working
- ✔ Download engine working locally
- ✔ Firebase connected (basic)
- ❌ No devices system
- ❌ No agent system
- ❌ No remote execution

# 🚀 TARGET (This Phase)

One user → Multiple devices → Remote downloads using **Event-Driven Architecture**

---

## 🏗️ PHASE 1 — Device System (Foundation & Presence)

**🎯 Goal:** Make Firebase aware of devices instantly and cheaply.

### 📁 Architecture: Firebase Realtime Database (RTDB) for Presence

Firestore is too expensive for high-frequency heartbeats. We use RTDB to track online/offline status with zero write costs for maintaining the connection.

**Structure (RTDB):**

```text
presence/
  device_id/
    name: "My Laptop"
    status: "online" | "offline"
    last_online: timestamp
    platform: "windows" | "linux"
```

### ⚙️ What to implement:

1. **Device Registration & Presence (from Agent)**
   When agent starts:
   - Generate or load `device_id`
   - Connect to Firebase RTDB and set `status = "online"`
   - Configure `onDisconnect()` hook: *"If my connection drops, change my status to 'offline'"*

**✅ Outcome:** Your website can list devices and their real-time state without continuous polling costs.

---

## 🏗️ PHASE 2 — Agent (Core Execution Layer)

**🎯 Goal:** Make device capable of receiving jobs instantly with ZERO idle cost.

### ⚙️ Agent Responsibilities:

- Connect to Firebase (RTDB for presence, Firestore for jobs)
- Listen for new jobs via WebSockets (Event-Driven)
- Execute jobs
- Update job status thoughtfully to avoid quota limits

### 🧩 Internal Flow (Event-Driven):

```text
Start Agent
   ↓
Register Device (RTDB Presence)
   ↓
Attach Firestore Listener (`onSnapshot`)
   ↓
Go Idle (Zero CPU / Read costs)
   ↓
New Job Event Received!
   - Lock Job
   - Execute Download
   - Finish / Update Status
   - Go back to Idle
```

**⚠️ The Golden Rule:**

- **DO NOT POLL.** Use Firestore's `onSnapshot` (or Python equivalent `on_snapshot`). The agent only wakes up when Firebase pushes a document to it.

**✅ Outcome:** Device becomes a highly efficient worker node.

---

## 🏗️ PHASE 3 — Job System

**🎯 Goal:** Send tasks from website → device reliably.

### 📁 Create jobs collection (Firestore)

```text
jobs/
  job_id/
    device_id
    url
    type
    status: pending | running | completed | error | cancelling | cancelled
    progress: 0 to 100
    retry_count: 0
    created_at
    updated_at
```

### ⚙️ What to implement:

1. **Website → Create Job**

   - User selects: URL, Device
   - 👉 Store job in Firestore `jobs` collection.
2. **Agent → Instant Job Reception**

   - The `onSnapshot` listener triggers instantly because a new `pending` job matched its `device_id`.
3. **Agent → Lock Job**

   - Update: `status = 'running'`, `updated_at = now()`.
4. **Execute Download**

   - Call your controller. Monitor for `cancelling` status changes (via the same listener).
5. **Update Progress (THROTTLED)**

   - To save write costs, only update Firestore `progress` every 10% or 10 seconds. Do not update it on every byte.
   - Alternatively, write continuous progress to RTDB, and only final status to Firestore.
6. **Completion**

   - Set: `status = 'completed'`.

**✅ Outcome:** Remote download works instantly and cost-effectively 🎯

---

## 🏗️ PHASE 4 — Frontend Device Integration

**🎯 Goal:** Control which device downloads.

### ⚙️ Add UI:

1. **Device List**

   - Listen to RTDB `presence` node. Show Device name, Online/Offline (instant updates).
2. **Device Selector**

   - While downloading: `[ Select Device ▼ ]`
3. **Job Dashboard**

   - Listen to Firestore `jobs`. Show: Job status, Progress, Device name. Add a "Cancel" button.

**✅ Outcome:** User controls where download runs and can manage them.

---

## 🏗️ PHASE 5 — Agent Packaging

**🎯 Goal:** Make agent usable on other devices.

### ⚙️ Steps:

1. **Bundle:**
   - Agent, Controller, Engines
2. **Create executable**
3. **Add:**
   - Auto start option
   - Simple logs
4. **Host it:**
   - Provide download via website

**✅ Outcome:** Any device can join the system natively.

---

## 🏗️ PHASE 6 — Reliability & Edge Cases

**🎯 Goal:** Make system unbreakable.

### Add:

- ✔ **Zombie Job Sweeper:** If a device disconnects abruptly (RTDB says offline), a Firebase Cloud Function or the frontend can find its `running` jobs in Firestore and reset them to `pending` while incrementing `retry_count`.
- ✔ **Job Cancellation:** User sets status to `cancelling`. Agent stops download, cleans up files, sets status to `cancelled`.
- ✔ **Concurrency Limits:** Agent should only process max N downloads at once, queuing the rest locally or leaving them `pending`.

---

## ⚡ IMPLEMENTATION ORDER (IMPORTANT)

**Follow EXACTLY this:**

1. RTDB Presence system (Device shows online/offline on website).
2. Agent connects and attaches Firestore `onSnapshot` listener (prints when job added manually in Firebase Console).
3. Jobs collection + creation from UI.
4. Agent executes jobs (connect controller to listener).
5. Throttled progress updates.
6. Job Cancellation & Zombie job handling.
7. Package agent.

---

## 🧠 Key Mindset

**You are building:**
An Event-Driven distributed system with:

- Central coordination (Firebase)
- Instant, cost-free idle listener connections (WebSockets)
- Multiple highly-efficient workers (Agents)
