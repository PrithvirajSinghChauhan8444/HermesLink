import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { endpoints } from '../../services/api';
import { formatBytes } from '../../utils/format';
import NewJobModal from '../features/NewJobModal';



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

export default function ActiveJobsSection() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({}); // { job_id: true/false }
    const [isModalOpen, setIsModalOpen] = useState(false);
    const containerRef = useRef(null);

    const fetchJobs = async () => {
        try {
            const response = await endpoints.jobs.active();
            setJobs(response.data.jobs);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching active jobs:", error);
            setLoading(false);
        }
    };

    const handleAction = async (jobId, action) => {
        setActionLoading(prev => ({ ...prev, [jobId]: action }));
        try {
            await endpoints.jobs.action(jobId, action);
            // Immediately refresh so the UI reflects the new state
            await fetchJobs();
        } catch (error) {
            console.error(`Error sending ${action} for job ${jobId}:`, error);
        } finally {
            setActionLoading(prev => ({ ...prev, [jobId]: null }));
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading && containerRef.current && jobs.length > 0) {
            gsap.fromTo(containerRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "power2.out", overwrite: "auto" }
            );
        }
    }, [loading]);

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
                    jobs.map((job) => {
                        const isRunning = job.state === 'RUNNING';
                        const isPaused = job.state === 'PAUSED';
                        const isPending = job.state === 'PENDING';
                        const busy = actionLoading[job.job_id];

                        return (
                            <div key={job.job_id} className="job-card group">
                                <div className="job-header">
                                    <div className="job-title-container">
                                        <div className={`status-indicator ${isRunning ? 'status-running' : isPaused ? 'status-paused' : 'status-pending'}`} />
                                        <h3 className="job-filename">{job.progress.filename || job.engine_config.url || job.job_id}</h3>
                                    </div>
                                    <span className="job-type-badge">
                                        {job.engine_config.type}
                                    </span>
                                </div>

                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${job.progress.percent || 0}%` }}
                                    >
                                        <div className="progress-bar-glow" />
                                    </div>
                                </div>

                                <div className="job-footer">
                                    <div className="job-stats-group">
                                        <span className="stat-pill">{formatBytes(job.progress.completed_length)} / {formatBytes(job.progress.total_length)}</span>
                                        <span className="stat-pill">{job.progress.speed || "0 B/s"}</span>
                                    </div>
                                    <span className="eta-text">ETA: <span className="eta-value">{job.progress.eta || "--:--:--"}</span></span>
                                </div>

                                {/* ── Control Buttons ── */}
                                <div className="job-controls">
                                    {/* PAUSE — only when running */}
                                    {isRunning && (
                                        <button
                                            id={`btn-pause-${job.job_id}`}
                                            className="ctrl-btn ctrl-pause"
                                            disabled={!!busy}
                                            onClick={() => handleAction(job.job_id, 'PAUSE')}
                                            title="Pause"
                                        >
                                            <PauseIcon />
                                            <span>{busy === 'PAUSE' ? '…' : 'Pause'}</span>
                                        </button>
                                    )}

                                    {/* RESUME — only when paused */}
                                    {isPaused && (
                                        <button
                                            id={`btn-resume-${job.job_id}`}
                                            className="ctrl-btn ctrl-resume"
                                            disabled={!!busy}
                                            onClick={() => handleAction(job.job_id, 'RESUME')}
                                            title="Resume"
                                        >
                                            <ResumeIcon />
                                            <span>{busy === 'RESUME' ? '…' : 'Resume'}</span>
                                        </button>
                                    )}

                                    {/* STOP — always available for active jobs */}
                                    {(isRunning || isPaused || isPending) && (
                                        <button
                                            id={`btn-stop-${job.job_id}`}
                                            className="ctrl-btn ctrl-stop"
                                            disabled={!!busy}
                                            onClick={() => handleAction(job.job_id, 'STOP')}
                                            title="Stop"
                                        >
                                            <StopIcon />
                                            <span>{busy === 'STOP' ? '…' : 'Stop'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <NewJobModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onJobCreated={fetchJobs}
            />
        </div>
    );
}
