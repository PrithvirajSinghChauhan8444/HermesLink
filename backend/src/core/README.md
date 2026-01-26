# 🧠 Core Logic (`src/core`)

> **The System's Cerebral Cortex** 🧬

This folder handles the complex logic of managing jobs, queues, and ensuring everything runs smoothly without crashing.

---

## 📄 Key Files

- **`job_manager.py`** 👔
  - **Role**: The Boss. Manages the lifecycle of every job.
  - **Responsibilities**: Loading/Saving jobs (persistence), handling queues, and crash recovery.
- **`job_controller.py`** 🎮
  - **Role**: The Gatekeeper.
  - **Responsibilities**: Validates user commands (Pause, Stop, Resume) against the strict State Machine.
- **`models.py`** 🧱
  - **Role**: The Blueprints.
  - **Responsibilities**: Defines `Job`, `JobState`, `QueueConfig`, and `QueueState` data structures.
- **`job_runner.py`** 🏃
  - **Role**: The Worker.
  - **Responsibilities**: Executes the actual download logic in threads/processes.

---

## ⚙️ How it Works

1.  **Strict Serialization**: The core enforces a rule where **only one job** runs globally at a time to maximize bandwidth for that single file.
2.  **Multi-Queue Priority**: While execution is serial, queuing is smart. High-priority queues get processed first.
3.  **State Machine**:
    `PENDING` ➡️ `RUNNING` 🔄 `PAUSED` ➡️ `COMPLETED` / `FAILED`
