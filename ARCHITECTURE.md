# HermesLink Architecture

This document provides a visual overview of the HermesLink system architecture, including system context, component interactions, and state management.

## 1. System Context

High-level view of how HermesLink interacts with the user and external systems.

```mermaid
graph TD
    User((User))

    subgraph HermesLink_System [HermesLink System]
        HL[HermesLink Controller]
        UI[Dashboard / CLI]
    end

    subgraph External_Systems [External Systems]
        Web[HTTP/HTTPS Servers]
        YT[Video Platforms]
        P2P[P2P Network]
        Aria[Aria2 Daemon]
    end

    User -->|Commands| UI
    UI -->|Control| HL
    HL -->|RPC| Aria
    HL -->|HTTP| Web
    HL -->|Subprocess| YT
    Aria -->|Download| Web
    Aria -->|Download| P2P
```

## 2. Component Architecture

breakdown of the internal components and their relationships.

```mermaid
classDiagram
    direction TB

    class Controller {
        +parse_args()
        +start_loop()
        +handle_input()
    }

    class JobManager {
        -jobs: Dict
        +create_job()
        +update_job()
        +save_jobs()
    }

    class EngineManager {
        +get_engine()
    }

    class BaseEngine {
        <<Abstract>>
        +download()
        +pause()
        +resume()
        +stop()
    }

    class Aria2Engine
    class MediaEngine
    class DirectEngine

    Controller --> JobManager : Manages State
    Controller --> EngineManager : Requests Engine
    EngineManager ..> BaseEngine : Returns
    BaseEngine <|-- Aria2Engine
    BaseEngine <|-- MediaEngine
    BaseEngine <|-- DirectEngine

    JobManager --> Models : Uses
```

## 3. Job Lifecycle

The state transitions of a generic download job within HermesLink.

```mermaid
stateDiagram-v2
    [*] --> PENDING: Job Created

    PENDING --> DOWNLOADING: Start

    state DOWNLOADING {
        [*] --> CONNECTING
        CONNECTING --> TRANSFERRING
        TRANSFERRING --> CONNECTING : Network/Retry
    }

    DOWNLOADING --> PAUSED: User Action
    PAUSED --> DOWNLOADING: Resume

    DOWNLOADING --> ERROR: Failure
    ERROR --> DOWNLOADING: Retry/Auto-Recover
    ERROR --> FAILED: Max Retries / Fatal

    DOWNLOADING --> COMPLETED: Success

    FAILED --> [*]
    COMPLETED --> [*]
```

## 4. Download Sequence

The sequence of operations when a user initiates a download.

```mermaid
sequenceDiagram
    actor User
    participant CLI as Controller
    participant JM as JobManager
    participant EM as EngineManager
    participant ENG as Engine

    User->>CLI: start "URL" --engine aria2
    CLI->>JM: create_job(url, type)
    JM-->>CLI: job_id

    CLI->>EM: get_engine("aria2")
    EM-->>CLI: Aria2Engine instance

    CLI->>ENG: start_download(job_id, url)
    activate ENG
    ENG->>ENG: initialize()
    ENG-->>CLI: status (started)
    deactivate ENG

    loop Monitoring Loop
        CLI->>ENG: get_status()
        ENG-->>CLI: progress, speed, state
        CLI->>User: Update Display
    end
```
