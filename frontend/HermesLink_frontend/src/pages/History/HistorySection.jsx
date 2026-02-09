import React, { useState } from "react";
import { motion } from "motion/react";
import { useJobs, formatDate, extractFilename } from "../../hooks/useJobs";
import {
    AnimatedSection,
    StaggerContainer,
    StaggerItem,
} from "../../components/animations/ScrollAnimations";
import "./HistorySection.css";

const FILTERS = [
    { id: "all", label: "All", icon: "📋" },
    { id: "completed", label: "Completed", icon: "✅" },
    { id: "failed", label: "Failed", icon: "❌" },
];

const HistoryItem = ({ job, index }) => {
    const filename = extractFilename(job);
    const stateClass = {
        COMPLETED: "badge-success",
        FAILED: "badge-danger",
        STOPPED: "badge-warning",
    };

    return (
        <motion.div
            className="history-item glass-card"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileHover={{ x: 8 }}
        >
            <div className="history-item-info">
                <h4 className="history-filename">{filename}</h4>
                <p className="history-meta">
                    <span>{job.engine_config?.type?.toUpperCase()}</span>
                    <span className="meta-dot">•</span>
                    <span>{formatDate(job.updated_at)}</span>
                </p>
            </div>
            <span className={`badge ${stateClass[job.state] || "badge-info"}`}>
                {job.state}
            </span>
        </motion.div>
    );
};

const HistorySection = () => {
    const { jobs, loading, error, refresh } = useJobs("history");
    const [filter, setFilter] = useState("all");

    const filteredJobs = jobs.filter((job) => {
        if (filter === "completed") return job.state === "COMPLETED";
        if (filter === "failed") return job.state === "FAILED";
        return true;
    });

    const stats = {
        total: jobs.length,
        completed: jobs.filter((j) => j.state === "COMPLETED").length,
        failed: jobs.filter((j) => j.state === "FAILED").length,
    };

    return (
        <div className="section-container history-section">
            <div className="section-inner">
                <AnimatedSection className="section-header">
                    <h2 className="section-title">Download History</h2>
                    <p className="section-subtitle">
                        Track all your past downloads and their completion status
                    </p>
                </AnimatedSection>

                {/* Stats Bar */}
                <AnimatedSection delay={0.2} className="stats-bar">
                    <div className="stat-item">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-item stat-success">
                        <span className="stat-value">{stats.completed}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                    <div className="stat-item stat-danger">
                        <span className="stat-value">{stats.failed}</span>
                        <span className="stat-label">Failed</span>
                    </div>
                </AnimatedSection>

                {/* Filter Tabs */}
                <AnimatedSection delay={0.3} className="filter-tabs">
                    {FILTERS.map((f) => (
                        <motion.button
                            key={f.id}
                            className={`filter-tab ${filter === f.id ? "active" : ""}`}
                            onClick={() => setFilter(f.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span>{f.icon}</span>
                            <span>{f.label}</span>
                        </motion.button>
                    ))}
                </AnimatedSection>

                {/* History List */}
                <div className="history-list">
                    {loading && jobs.length === 0 && (
                        <StaggerContainer>
                            {[1, 2, 3, 4].map((i) => (
                                <StaggerItem key={i}>
                                    <div className="skeleton-card" />
                                </StaggerItem>
                            ))}
                        </StaggerContainer>
                    )}

                    {!loading && filteredJobs.length === 0 && (
                        <div className="empty-state glass-card">
                            <div className="empty-icon">📝</div>
                            <h3>No history found</h3>
                            <p>Completed downloads will appear here</p>
                        </div>
                    )}

                    {filteredJobs.map((job, index) => (
                        <HistoryItem key={job.job_id} job={job} index={index} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HistorySection;
