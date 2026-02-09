import React from "react";
import { motion } from "motion/react";
import { useJobs, formatBytes, extractFilename } from "../../hooks/useJobs";
import {
    AnimatedSection,
    StaggerContainer,
    StaggerItem,
} from "../../components/animations/ScrollAnimations";
import "./ActiveJobsSection.css";

const JobCard = ({ job, index }) => {
    const filename = extractFilename(job);
    const percent = job.progress?.percent || 0;
    const speed = job.progress?.speed || "-";
    const totalSize = job.progress?.total_length
        ? formatBytes(job.progress.total_length)
        : "-";

    const stateColors = {
        PENDING: "badge-warning",
        RUNNING: "badge-info",
        PAUSED: "badge-muted",
    };

    return (
        <motion.div
            className="job-card glass-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
        >
            <div className="job-header">
                <div className="job-info">
                    <h4 className="job-filename">{filename}</h4>
                    <p className="job-meta">
                        {job.engine_config?.type?.toUpperCase()} • {totalSize}
                    </p>
                </div>
                <span className={`badge ${stateColors[job.state] || "badge-info"}`}>
                    {job.state}
                </span>
            </div>

            <div className="progress-bar">
                <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>

            <div className="job-footer">
                <span className="job-percent">{percent.toFixed(1)}%</span>
                <span className="job-speed">{speed}</span>
            </div>
        </motion.div>
    );
};

const EmptyState = () => (
    <motion.div
        className="empty-state glass-card"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
    >
        <div className="empty-icon">📭</div>
        <h3>No Active Downloads</h3>
        <p>Start a download to see it here</p>
    </motion.div>
);

const ActiveJobsSection = () => {
    const { jobs, loading, error, refresh } = useJobs("active", 3000);

    return (
        <div className="section-container active-jobs-section">
            <div className="section-inner">
                <AnimatedSection className="section-header">
                    <h2 className="section-title">Active Downloads</h2>
                    <p className="section-subtitle">
                        Monitor your downloads in real-time with live progress tracking
                    </p>
                </AnimatedSection>

                <AnimatedSection delay={0.2}>
                    <div className="section-actions">
                        <motion.button
                            className="btn btn-secondary"
                            onClick={refresh}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span>🔄</span>
                            <span>Refresh</span>
                        </motion.button>
                    </div>
                </AnimatedSection>

                <div className="jobs-grid">
                    {loading && jobs.length === 0 && (
                        <StaggerContainer className="skeleton-grid">
                            {[1, 2, 3].map((i) => (
                                <StaggerItem key={i}>
                                    <div className="skeleton-card" />
                                </StaggerItem>
                            ))}
                        </StaggerContainer>
                    )}

                    {!loading && !error && jobs.length === 0 && <EmptyState />}

                    {jobs.length > 0 && (
                        <div className="jobs-list">
                            {jobs.map((job, index) => (
                                <JobCard key={job.job_id} job={job} index={index} />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="error-state glass-card">
                            <p>⚠️ {error}</p>
                            <button className="btn btn-primary" onClick={refresh}>
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActiveJobsSection;
