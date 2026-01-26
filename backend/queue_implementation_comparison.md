# Queue System Comparison: Single vs Multi-Queue

This document outlines the key architectural and functional differences between the legacy Single-Queue system (v1) and the current Multi-Queue Scheduler (v2).

## 1. Data Structures & State

| Feature           | Legacy (Single Queue)                          | Current (Multi-Queue)                                                       |
| :---------------- | :--------------------------------------------- | :-------------------------------------------------------------------------- |
| **Queue Storage** | `self.queue`: A single `List[str]` of job IDs. | `self.queues`: A `Dict[str, QueueState]`, each containing its own job list. |
| **Configuration** | Implicit/Hardcoded defaults.                   | `self.configs`: A `Dict[str, QueueConfig]` storing settings per queue.      |
| **Job Model**     | No association to specific queues.             | `Job` model has a `queue_id` field (default: "default").                    |

## 2. Scheduling Logic

| Feature         | Legacy (`advance_queue`)        | Current (`process_queues`)                                                     |
| :-------------- | :------------------------------ | :----------------------------------------------------------------------------- |
| **Selection**   | Simple FIFO: Run next in list.  | Priority-based Round Robin: Iterates queues based on `priority` (High -> Low). |
| **Constraints** | Global Invariant: 1 Active Job. | Global Invariant: 1 Active Job.<br>+ Per-Queue Limits (`max_parallel_jobs`).   |
| **Process**     | Dequeue -> Run.                 | Find Queue -> Check Priority -> Check Limits -> Run.                           |

## 3. Configuration & Policy

| Feature         | Legacy                    | Current                                                                                    |
| :-------------- | :------------------------ | :----------------------------------------------------------------------------------------- |
| **Priority**    | First-In-First-Out only.  | Explicit `priority` integer per queue (e.g., Fast=20, Default=10).                         |
| **Parallelism** | Global Limit = 1.         | Global Limit = 1 (maintained), but architectural support for per-queue concurrency exists. |
| **Threads**     | Hardcoded/Engine default. | Configurable per queue (`max_threads_per_job`).                                            |

## 4. Persistence (`jobs.json`)

| Feature       | Legacy Schema                                                 | Current Schema                                                                        |
| :------------ | :------------------------------------------------------------ | :------------------------------------------------------------------------------------ |
| **Structure** | Root dictionary of jobs, or `{"jobs": {...}, "queue": [...]}` | `{"jobs": {...}, "queues": {...}, "configs": {...}}`                                  |
| **Migration** | N/A                                                           | Auto-migration logic detects legacy format and moves generic jobs to "default" queue. |

## 5. User Interface (CLI & Dashboard)

| Feature        | Legacy                       | Current                                                            |
| :------------- | :--------------------------- | :----------------------------------------------------------------- |
| **Dashboard**  | Flat list of all jobs.       | Interactive View: Filter by specific Queue; Shows Queue ID column. |
| **Controller** | Add Download -> Direct Add.  | Add Download -> Select/Create Queue -> Add.                        |
| **Management** | Job Logic only (Pause/Stop). | **Queue Management**: Create, Delete, View Queue Stats.            |

## Summary of Improvements

The transition to a multi-queue system provides:

1.  **Isolation**: Different types of downloads (e.g., "Critical" vs "Background") can be managed separately.
2.  **Prioritization**: Users can ensure high-priority downloads start before bulk/background tasks.
3.  **Scalability**: The system architecture now supports defining different resource limits (threads) for different workloads.
