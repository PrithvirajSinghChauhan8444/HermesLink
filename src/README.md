# Source Directory (`src`)

This directory contains the core source code for the HermesLink application.

## Files

- `controller.py`: The main CLI entry point.
  - Supports interactive controls (Pause/Resume/Stop).
  - Features smart error recovery and interactive prompts for unrecoverable errors.
- `dashboard.py`: Contains the dashboard implementation for visualizing download status.
- `jobs.json`: A JSON file used for persisting download job states.

## Subdirectories

- `core/`: Contains core business logic and management modules (e.g., Job Manager, Models).
- `engines/`: Contains download engine implementations (Media, P2P, Direct, Aria2).
- `research/`: Contains research documents and specifications.
