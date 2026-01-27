# Backend-Dependent Components and Buttons

This document outlines the UI components and interactive elements for the HermesLink dashboard that require a backend connection to function. This is based on the analysis of the backend [JobManager](file:///g:/Projects/HermesLink/backend/src/core/job_manager.py#12-472), `JobController`, and [Dashboard](file:///g:/Projects/HermesLink/backend/src/dashboard.py#19-137) logic.

## 1. Dashboard / Job List View
These components display real-time state from the backend.

| Component | Backend Data/Action | Update Frequency |
| :--- | :--- | :--- |
| **Job List Table** | `JobManager.list_jobs()` | Poll/Socket (High) |
| - *Row Data* | `job_id`, `queue_id`, `type`, `state`, `progress.percent`, `progress.speed`, `filename` | |
| **Active Job Indicator** | `JobManager.get_active_job()` | Poll/Socket (High) |
| **Filter Dropdown** | `JobManager.queues.keys()` (List of Queue IDs) | On Load / Event |

## 2. Job Control Actions (Buttons)
These buttons trigger state transitions in the backend. They should be visible/enabled based on the job's current state.

| Button Label | Action Endpoint / Method | Enabled State Condition |
| :--- | :--- | :--- |
| **Pause** | `controller.handle_command(job_id, 'PAUSE')` -> `JobManager.pause_job` | `RUNNING` |
| **Resume** | `controller.handle_command(job_id, 'RESUME')` -> `JobManager.resume_job` | `PAUSED` |
| **Stop** | `controller.handle_command(job_id, 'STOP')` -> `JobManager.stop_job` | `RUNNING`, `PAUSED`, `PENDING` |
| **Retry** | `controller.handle_command(job_id, 'RETRY')` -> `JobManager.retry_job` | `FAILED` |
| **Restart** | `controller.handle_command(job_id, 'RESTART')` -> `JobManager.restart_job` | `COMPLETED`, `STOPPED`, `FAILED` |

## 3. Queue Management
Components for managing the multi-queue system.

| Component | Backend Action | Inputs |
| :--- | :--- | :--- |
| **Create Queue Button** | `JobManager.create_queue` | `queue_id`, `max_parallel_jobs`, `max_threads_per_job`, `priority` |
| **Delete Queue Button** | `JobManager.delete_queue` | `queue_id` (Confirmation required) |
| **Queue List/Stats** | `JobManager.configs`, `JobManager.queues` | Display `pending_count`, `active_count` per queue |

## 4. Add Download Form
Form to submit new jobs to the backend.

| Input Field | Description | Backend Logic |
| :--- | :--- | :--- |
| **URL Input** | Text area for URLs | `extract_urls(input)` utils |
| **Type Select** | Dropdown (`media`, `p2p`, `direct`, `aria2`) | `job.engine_config.type` |
| **Queue Select** | Dropdown of available queues | `job.queue_id` |
| **Submit Button** | `JobManager.create_job` | Sends Payload: `{url, type, destination}`, `queue_id` |

## 5. System Controls
Global actions.

| Button | Backend Action | Notes |
| :--- | :--- | :--- |
| **Kill Switch (Stop All)** | `JobManager.stop_all_jobs()` | **CRITICAL**: Requires confirmation/verification code in CLI, UI should have double-confirm modal. |

## Data Models (Frontend Type Definitions)
To support these components, the frontend [api.js](file:///g:/Projects/HermesLink/frontend/HermesLink_frontend/src/services/api.js) (currently empty) needs to interact with endpoints exposing:
- [Job](file:///g:/Projects/HermesLink/backend/src/core/job_manager.py#12-472) object structure
- `QueueConfig` structure
- `JobState` enum (`PENDING`, `RUNNING`, `PAUSED`, `FAILED`, `COMPLETED`, `STOPPED`)
