import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { endpoints } from '../../services/api';
import { formatBytes } from '../../utils/format';

import './ActiveJobsSection.css';

export default function ActiveJobsSection() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalSpeed, setTotalSpeed] = useState("0 B/s");
    const containerRef = useRef(null);

    const fetchJobs = async () => {
        try {
            const response = await endpoints.jobs.active();
            setJobs(response.data.jobs);

            // Calculate total speed if possible (mock for now as backend sends formatted strings)
            // Ideally backend sends raw bytes, but we'll just show active count
            setLoading(false);
        } catch (error) {
            console.error("Error fetching active jobs:", error);
            setLoading(false);
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
                        <div key={job.job_id} className="job-card group">
                            <div className="job-header">
                                <div className="job-title-container">
                                    <div className={`status-indicator ${job.state === 'RUNNING' ? 'status-running' : 'status-paused'}`} />
                                    <h3 className="job-filename">{job.progress.filename || job.job_id}</h3>
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
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
