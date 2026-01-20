# Core Directory (`src/core`)

This directory contains the core logic for managing the application state, data models, and job orchestration.

## Files

- `job_manager.py`: Manages the lifecycle of download jobs.
  - **Persistence**: Uses atomic file writes (`os.replace`) to prevent data corruption.
  - **Concurrency**: Implements retry logic to handle Windows file locking conflicts with the Dashboard.
- `models.py`: Defines the data models and data structures used throughout the application, such as Job objects and State enumerations.
