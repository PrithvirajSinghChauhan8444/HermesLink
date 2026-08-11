import { useState, useEffect, useRef } from 'react';
import { useJobProgress } from '../../hooks/useJobProgress';
import { formatBytes } from '../../utils/format';

// Tiny inline SVG icons
const PauseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
);
const ResumeIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21" />
    </svg>
);
const StopIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
);

export default function ActiveJobCard({ job, actionLoading, handleAction, deviceMap }) {
    const isRunning = job.state === 'RUNNING';
    const isPending = job.state === 'PENDING';
    const busy = actionLoading[job.job_id || job.id];
    const device = deviceMap[job.device_id];
    const jobKey = job.job_id || job.id;

    const liveProgress = useJobProgress(jobKey);
    const [optimisticProgress, setOptimisticProgress] = useState(null);
    const lastProgressRef = useRef(null);

    // Sync progress data and calculate download speed in Bps for projection
    useEffect(() => {
        const prog = liveProgress || job.progress;
        if (!prog) return;
        
        let speedBps = 0;
        if (prog.speed) {
            const match = prog.speed.match(/([\d.]+)\s*(MB|KB|B)\/s/);
            if (match) {
                const val = parseFloat(match[1]);
                const unit = match[2];
                if (unit === 'MB') speedBps = val * 1024 * 1024;
                else if (unit === 'KB') speedBps = val * 1024;
                else speedBps = val;
            }
        }
        
        lastProgressRef.current = {
            completedLength: parseInt(prog.completed_length || 0, 10),
            totalLength: parseInt(prog.total_length || 0, 10),
            percent: parseFloat(prog.percent || 0),
            speedBps,
            timestamp: Date.now()
        };
        
        setOptimisticProgress({
            completed_length: lastProgressRef.current.completedLength,
            percent: lastProgressRef.current.percent
        });
    }, [liveProgress, job.progress]);

    // Optimistic progress projection ticking
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            if (!lastProgressRef.current || lastProgressRef.current.speedBps <= 0) return;

            const now = Date.now();
            const { completedLength, totalLength, percent, speedBps, timestamp } = lastProgressRef.current;
            
            if (totalLength <= 0) return;

            const elapsedSec = (now - timestamp) / 1000;
            
            // Decay projected speed if no updates received after 5.5 seconds
            let effectiveSpeed = speedBps;
            if (elapsedSec > 5.5) {
                effectiveSpeed = speedBps * Math.pow(0.5, (elapsedSec - 5.5) / 2);
            }
            
            let projectedCompleted = completedLength + (elapsedSec * effectiveSpeed);
            
            // Cap at +5% of current completed OR total length
            const capLength = completedLength + (totalLength * 0.05);
            if (projectedCompleted > capLength) projectedCompleted = capLength;
            if (projectedCompleted > totalLength) projectedCompleted = totalLength;
            
            const projectedPercent = (projectedCompleted / totalLength) * 100;
            
            setOptimisticProgress(prev => {
                if (!prev) return { completed_length: projectedCompleted, percent: projectedPercent };
                if (Math.abs(prev.percent - projectedPercent) < 0.05) return prev;
                return { completed_length: projectedCompleted, percent: projectedPercent };
            });
        }, 150);

        return () => clearInterval(interval);
    }, [isRunning]);

    const mergedProgress = { ...(liveProgress || job.progress || {}) };
    if (optimisticProgress) {
        mergedProgress.completed_length = optimisticProgress.completed_length;
        mergedProgress.percent = optimisticProgress.percent;
    }

    return (
        <div className="job-card group">
            <div className="job-header">
                <div className="job-title-container">
                    <div className={`status-indicator ${isRunning ? 'status-running' : 'status-pending'}`} />
                    <h3 className="job-filename">
                        {job.engine_config?.by_user_file_name 
                            || mergedProgress.filename 
                            || job.engine_config?.url?.split('/').filter(Boolean).pop() 
                            || jobKey}
                    </h3>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {device && (
                        <span className="job-type-badge" style={{ background: 'rgba(99,250,140,0.08)', borderColor: 'rgba(99,250,140,0.2)', color: '#63fa8c' }}>
                            {device.status === 'online' ? '🟢' : '🔴'} {device.name}
                        </span>
                    )}
                    <span className="job-type-badge">
                        {job.engine_config?.type || 'job'}
                    </span>
                </div>
            </div>

            <div className="progress-bar-container">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${mergedProgress.percent || 0}%` }}
                >
                    <div className="progress-bar-glow" />
                </div>
            </div>

            <div className="job-footer">
                <div className="job-stats-group">
                    <span className="stat-pill">
                        {formatBytes(mergedProgress.completed_length)} / {formatBytes(mergedProgress.total_length)}
                    </span>
                    <span className="stat-pill">{mergedProgress.speed || "0 B/s"}</span>
                </div>
                <span className="eta-text">ETA: <span className="eta-value">{mergedProgress.eta || "--:--:--"}</span></span>
            </div>

            <div className="job-controls">
                {(isRunning || isPending) && (
                    <button
                        className="ctrl-btn ctrl-pause"
                        disabled={!!busy}
                        onClick={() => handleAction(jobKey, 'PAUSE')}
                        title="Pause"
                    >
                        <PauseIcon />
                        <span>{busy === 'PAUSE' ? '…' : 'Pause'}</span>
                    </button>
                )}
                {job.state === 'PAUSED' && (
                    <button
                        className="ctrl-btn ctrl-resume"
                        disabled={!!busy}
                        onClick={() => handleAction(jobKey, 'RESUME')}
                        title="Resume"
                    >
                        <ResumeIcon />
                        <span>{busy === 'RESUME' ? '…' : 'Resume'}</span>
                    </button>
                )}
                {(isRunning || isPending || job.state === 'PAUSED') && (
                    <button
                        id={`btn-cancel-${jobKey}`}
                        className="ctrl-btn ctrl-stop"
                        disabled={!!busy}
                        onClick={() => handleAction(jobKey, 'CANCEL')}
                        title="Cancel"
                    >
                        <StopIcon />
                        <span>{busy === 'CANCEL' ? '…' : 'Cancel'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
