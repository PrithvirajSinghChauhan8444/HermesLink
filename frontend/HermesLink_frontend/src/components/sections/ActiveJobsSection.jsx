import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import gsap from 'gsap';
import { db, rtdb } from '../../config/firebase';
import { useJobs } from '../../hooks/useJobs';
import { useDevices } from '../../hooks/useDevices';
import { formatBytes } from '../../utils/format';
import NewJobModal from '../features/NewJobModal';
import { useJobProgress } from '../../hooks/useJobProgress';

import './ActiveJobsSection.css';

// Icons as tiny inline SVGs
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

const ActiveJobCard = ({ job, actionLoading, handleAction, deviceMap }) => {
    const isRunning = job.state === 'RUNNING';
    const isPending = job.state === 'PENDING';
    const busy = actionLoading[job.job_id || job.id];
    const device = deviceMap[job.device_id];
    const jobKey = job.job_id || job.id;

    const liveProgress = useJobProgress(jobKey);
    const mergedProgress = liveProgress || job.progress || {};

    return (
        <div className="job-card group">
            <div className="job-header">
                <div className="job-title-container">
                    <div className={`status-indicator ${isRunning ? 'status-running' : 'status-pending'}`} />
                    <h3 className="job-filename">
                        {mergedProgress.filename || job.engine_config?.url || jobKey}
                    </h3>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* Device badge */}
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

            {/* Control Buttons */}
            <div className="job-controls">
                {/* Pause — available when active */}
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
                {/* Resume — available when paused */}
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
                {/* Cancel — always available for active/paused jobs */}
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
};

export default function ActiveJobsSection() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // { job_id: action }
    const containerRef = useRef(null);

    // Real-time Firestore listener — no more polling!
    const { jobs, loading } = useJobs({ states: ['PENDING', 'RUNNING', 'PAUSED'] });

    // Live device presence — to show device name on each job card
    const { devices } = useDevices();
    const deviceMap = Object.fromEntries(devices.map(d => [d.device_id, d]));

    // Animate job cards on first load
    useEffect(() => {
        if (!loading && containerRef.current && jobs.length > 0) {
            gsap.fromTo(containerRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "power2.out", overwrite: "auto" }
            );
        }
    }, [loading]);

    const handleAction = async (jobId, action) => {
        setActionLoading(prev => ({ ...prev, [jobId]: action }));
        try {
            // Write control action to RTDB for the agent to pick up
            const actionRef = ref(rtdb, `jobs/${jobId}/action`);
            await set(actionRef, action);
        } catch (error) {
            console.error(`Error sending ${action} for job ${jobId}:`, error);
        } finally {
            setActionLoading(prev => ({ ...prev, [jobId]: null }));
        }
    };

    return (
        <div className="active-jobs-container">
            <div className="header-container">
                <div>
                    <h2 className="title-large">Active Operations</h2>
                    <p className="subtitle-gray">Real-time download monitoring</p>
                </div>
                <button
                    className="new-download-btn"
                    onClick={() => setIsModalOpen(true)}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Download
                </button>
                <div className="stats-container">
                    <span className="stat-number-large">{jobs.length}</span>
                    <span className="stat-label-small">Running Tasks</span>
                </div>
            </div>

            <div ref={containerRef} className="jobs-grid-container">
                {loading ? (
                    <div className="loading-text">Syncing...</div>
                ) : jobs.length === 0 ? (
                    <div className="empty-state-container">
                        <span className="empty-title">System Idle</span>
                        <span className="empty-subtitle">No active downloads</span>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <ActiveJobCard
                            key={job.job_id || job.id}
                            job={job}
                            actionLoading={actionLoading}
                            handleAction={handleAction}
                            deviceMap={deviceMap}
                        />
                    ))
                )}
            </div>

            <NewJobModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onJobCreated={() => {}} // useJobs updates automatically — no manual refresh needed
            />
        </div>
    );
}
