# UI Responsiveness & Progress Animation Plan

The goal is to eliminate the 30-second UI freezes by updating the backend agent more frequently and using an optimistic progress animation on the frontend.

## User Review Required

I think your suggestion of optimistic UI updating (extrapolating progress locally using the last known download speed) is an excellent approach! It significantly enhances perceived performance. 

**My Additional Suggestions:**
1. **Exponential Decay on Speed:** While capping the optimistic progress at +5% is smart to prevent backward snapping, we can also apply a slight "decay" to the speed if the update is taking longer than the expected 5 seconds. If we don't hear back after 5-6 seconds, the speed is likely dropping, so slowing down the optimistic animation makes the stall feel more natural when it eventually halts at the 5% cap.
2. **Instant State Triggers:** In `test_agent.py` and `agent.py`, job state transitions (`transition_job`) already trigger instant Firebase writes. We just need to ensure `MONITOR_INTERVAL_SECONDS` is lowered to `5` to fetch the download progress itself more frequently.
3. **Frontend Implementation:** We will implement this in the React components (likely using a `requestAnimationFrame` loop or `setInterval`) that calculate the time elapsed since the `updated_at` timestamp.

## Proposed Changes

### Backend Agent Updates
- Update `backend/src/test_agent.py` and `backend/src/agent.py`.
- **Change:** Decrease `MONITOR_INTERVAL_SECONDS` from `30` to `5` so progress is pushed more often.

### Frontend UI Animation
- Locate the main `DownloadItem` or `ProgressBar` component rendering the active jobs.
- **Change:** Implement a local state `optimisticProgress` that is derived from the real progress.
  - Formula: `optimisticDownloaded = realDownloaded + (elapsedTimeSeconds * speed)`.
  - Cap 1: `optimisticDownloaded <= realDownloaded + (totalSize * 0.05)`.
  - Cap 2: `optimisticDownloaded <= totalSize`.
  - Convert this back to a percentage to feed to the visual bar.

## Verification Plan
### Automated Tests
- N/A
### Manual Verification
- Start a large download.
- Observe the frontend progress bar moving smoothly continuously, rather than jumping in big steps every 30 seconds.
- Simulate a network bottleneck (or pausing the backend agent temporarily) to verify the progress bar correctly stops at +5% rather than overshooting and glitching backwards.
