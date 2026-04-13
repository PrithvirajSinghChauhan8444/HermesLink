# HermesLink Architecture Summary

## Overview

HermesLink follows a **server-based architecture with distributed local workers**.

The system is split into two clear roles:

- **Local devices** run the actual download engines and handle all heavy tasks.
- A **central web server** acts as the control plane, coordinating devices and managing jobs.

---

## Core Design

### Central Control Server (Always-On)

The web backend runs as a **persistent server** and is responsible for:

- Device registration and authentication
- Job and queue management
- Task assignment to specific devices
- Real-time status and progress tracking
- Handling device disconnects and reassignment

The server maintains **long-lived state** and stays active at all times.

---

### Local Devices (Worker Nodes)

Each device:

- Connects to the server using a **persistent connection**
- Waits for tasks to be assigned
- Executes downloads locally using native tools
- Reports progress, status, and results back to the server

This keeps bandwidth-heavy and disk-intensive operations off the cloud.

---

## Communication Model

- Devices maintain **persistent connections** (e.g., WebSockets or streaming protocols)
- The server **pushes jobs instantly** instead of devices polling
- Enables real-time updates similar to systems like messaging platforms

---

## Why Not Serverless

Serverless architectures are unsuitable for the core system because they:

- Cannot maintain persistent connections
- Are stateless by design
- Have execution time limits
- Cannot coordinate long-running or distributed jobs

Serverless components may be used **only for auxiliary tasks**, such as:
- Notifications
- Webhooks
- Lightweight public APIs

---

## Final Architecture Model

- **Backend:** Server-based control plane (always running)
- **Workers:** Distributed local devices
- **Execution:** Local, device-side
- **Coordination:** Centralized, real-time, push-based

This architecture enables **reliable, scalable, real-time orchestration of distributed local download workers** while keeping the system efficient and cloud-light.