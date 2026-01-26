# HermesLink Feature List for Web UI

## 1. Global Dashboard (Overview Layer)

- **System Status**:
  - Global "Active Job" Indicator (Since strict 1-job limit enforces high-level serialization).
  - Total Jobs Count (by State).
  - Scheduler Status (Running/Idle).
- **Global Controls**:
  - **Panic Button / Stop All**: Immediately stops all active jobs (Running/Paused) and clears queues (Danger Zone).
  - **Refresh**: Manual refresh trigger (though UI should likely be real-time/poll).

## 2. Queue Management (The Scheduler View)

Since the system is multi-queue, the UI needs a dedicated view or a grouped view for queues.

- **Queue List**:
  - Display all named queues (e.g., "Default", "HighPriority", "NightTime").
  - **Indicators**:
    - Priority Level (Integer).
    - Config Limit ($$N$$ Parallel Jobs - though strictly limited to 1 global, this is a distinct config).
    - Thread Limit (Max threads per job in this queue).
    - Status (Enabled/Disabled).
    - Job Count (Pending/Total).
- **Queue Actions**:
  - **Create Queue**: Modal to input `queue_id`, `priority`, `max_threads`.
  - **Delete Queue**: Warning if jobs exist. Options: Force Delete (stops jobs) or Safe Delete.
  - **Toggle Queue**: Enable/Disable processing for specific queues.
  - **Edit Config**: Update priority or thread limits on the fly.

## 3. Job Management (The Job Feed)

- **Views / Filters**:
  - **All Jobs View**: Master list sorted by `updated_at`.
  - **By Queue**: Filter jobs specific to a queue.
  - **By State**: Filter (Active, Completed, Failed).
- **Columns / Data Points**:
  - **Job ID**: Short UUID (Display first 8 chars, copy full).
  - **Type**: Engine Type (Aria2, Direct, Media, P2P).
  - **Target**: Filename or URL (Truncated).
  - **State Badge**: Color-coded (Running=Green, Paused=Yellow, Failed=Red, Pending=Gray, Completed=Blue).
  - **Progress Bar**: Percentage (0-100%).
  - **Speed**: Current download speed (if Active).
  - **Queue Tag**: Which queue it belongs to.
- **Sort Order**:
  - Priority (Queue Priority + Order).
  - Recency (Created/Updated).

## 4. Job Control Actions (Interactive Elements)

Actions must be context-sensitive based on Job State.

- **PENDING Jobs**:
  - **Stop/Cancel**: Remove from queue.
- **RUNNING Jobs**:
  - **Pause**: Suspend current download.
  - **Stop**: Abort completely.
- **PAUSED Jobs**:
  - **Resume**: Continue download.
  - **Stop**: Abort completely.
- **FAILED Jobs**:
  - **Retry**: Re-queue the job to try again.
  - **Restart**: Wipe progress and start from 0%.
  - **Stop/Remove**: Ack failure and remove.
- **COMPLETED Jobs**:
  - **Remove/Archive**: Clear from list.
  - **Restart**: Re-download.

## 5. Job Creation (New Download)

- **Input Form**:
  - **URL/Magnet**: Text input.
  - **Engine Selector**: Dropdown (Auto-detect or force: Aria2, Youtube-DL, Direct).
  - **Queue Selector**: Dropdown to assign to a specific queue immediately.
  - **Advanced Options**:
    - Thread limit override? (If supported).
    - Filename override.

## 6. Technical / Backend Metadata (Detail View)

- **Job Details Panel**:
  - Full URL.
  - Error Logs / Reason (Critical for Failed jobs).
  - Timestamps (Created, Updated).
  - Engine Config (JSON view for debugging).
