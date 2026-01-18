# Source Directory (`src`)

This directory contains the core source code for the HermesLink application.

## Files

- `controller.py`: The main CLI entry point.
  - Supports interactive controls (Pause/Resume/Stop).
  - Features smart error recovery and interactive prompts for unrecoverable errors.

## Subdirectories

- `core/`: Contains core business logic and management modules (e.g., Job Manager).
- `engines/`: Contains download engine implementations (Media, P2P, Direct).
