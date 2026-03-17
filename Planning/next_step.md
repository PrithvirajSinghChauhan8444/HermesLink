# Phase 2 & 3: Agent Core Execution & Job System

This phase focuses on the heart of the event-driven architecture. We will establish a real-time connection between the Firestore database and the running Agents. The frontend (or user) will create jobs in Firestore, and the Agent will wake up instantly without polling.

## Proposed Changes

### Firestore Schema Setup

#### Collection: `jobs`
No code is needed to "create" a Firestore collection (it creates on write), but we will formalize the schema expected across the system based on `models.py`:
- `job_id`: string
- `device_id`: string
- `state`: "PENDING" | "RUNNING" | "STOPPED" | "COMPLETED" | "FAILED" 
- `engine_config`: map/dict (URL, options)
- `progress`: map/dict
- `created_at`: string
- `updated_at`: string

### Agent Core Execution Updates

#### [MODIFY] [backend/src/agent.py](file:///home/prit/Project_Linux/Hermeslink/HermesLink/backend/src/agent.py)
- **Attach Firestore Listener**: After initializing presence, the agent will attach a Firestore `on_snapshot` listener (via `watch()` in Python Admin SDK) filtering the `jobs` collection for `where("device_id", "==", self.device_id)` and `where("state", "==", "PENDING")`.
- **Instant Job Reception**: When a document triggers the listener, the Agent will immediately process the payload.
- **Lock Job**: The very first step upon receiving a `PENDING` job is to write back to Firestore setting `state: "RUNNING"` to ensure it's locked.
- **Job Execution Dummy**: We will integrate a placeholder execution flow that accepts the job, simulates a download (e.g., 5-second sleep), and updates `state` to `"COMPLETED"`.
- **Throttled Progress Update**: The agent will be capable of throttling progress writes to Firestore to avoid heavy quotas.

#### [MODIFY] [backend/src/core/job_manager.py](file:///home/prit/Project_Linux/Hermeslink/HermesLink/backend/src/core/job_manager.py)
We need to shift `JobManager` from a local JSON manager to a distributed Firestore manager.
- **Method `create_job`**: Modify this method to accept a `device_id` as a parameter. It will insert a new job directly into the Firestore `jobs` collection with `state = 'PENDING'`.

## Verification Plan

### Automated/Unit Tests
- None required for this phase.

### Manual Verification
1. We will run the updated `agent.py` in the terminal.
2. The agent should boot, set presence, and announce that it is listening for jobs on Firestore.
3. We will manually insert a test document into the Firestore `jobs` collection from the Firebase Console (targeting the agent's specific `device_id` and setting `state="PENDING"`).
4. **Validation:** The terminal running the agent should instantly react to the new document, claim it by printing "Locking Job", simulate the download, and print "Completed". We can verify in the Firebase Console that the document's state successfully changed to `"RUNNING"` and then `"COMPLETED"`. 
