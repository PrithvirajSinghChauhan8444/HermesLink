import React from "react";
import { useJobs, formatBytes, formatDate, extractFilename } from "../../hooks/useJobs";

import "./ActiveJobs.css";

/**
 * State badge component
 */
const StateBadge = ({ state }) => {
  const stateColors = {
    PENDING: { bg: "#fef3c7", color: "#92400e" },
    RUNNING: { bg: "#dbeafe", color: "#1e40af" },
    PAUSED: { bg: "#e5e7eb", color: "#374151" },
  };
  const style = stateColors[state] || { bg: "#e5e7eb", color: "#374151" };

  return (
    <span
      className="state-badge"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "0.75rem",
        fontWeight: "600",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      {state}
    </span>
  );
};

/**
 * Progress bar component
 */
const ProgressBar = ({ percent }) => {
  const pct = percent || 0;
  return (
    <div className="progress-bar-container" style={{
      width: "100%",
      height: "8px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      overflow: "hidden",
    }}>
      <div
        className="progress-bar-fill"
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: pct === 100 ? "#10b981" : "#3b82f6",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
};

/**
 * Job card component
 */
const JobCard = ({ job }) => {
  const filename = extractFilename(job);
  const percent = job.progress?.percent || 0;
  const speed = job.progress?.speed || "-";
  const totalSize = job.progress?.total_length
    ? formatBytes(job.progress.total_length)
    : "-";

  return (
    <div className="job-card" style={{
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(10px)",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "12px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: "500",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "#f9fafb",
          }}>
            {filename}
          </h4>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
            {job.engine_config?.type?.toUpperCase()} • {totalSize}
          </p>
        </div>
        <StateBadge state={job.state} />
      </div>

      <ProgressBar percent={percent} />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.75rem", color: "#9ca3af" }}>
        <span>{percent.toFixed(1)}%</span>
        <span>{speed}</span>
      </div>
    </div>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton = () => (
  <div>
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{
          height: "100px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          marginBottom: "12px",
          animation: "pulse 1.5s infinite",
        }}
      />
    ))}
  </div>
);

/**
 * Error display
 */
const ErrorDisplay = ({ error, onRetry }) => (
  <div style={{
    padding: "40px",
    textAlign: "center",
    color: "#f87171",
  }}>
    <p style={{ marginBottom: "16px" }}>⚠️ {error}</p>
    <button
      onClick={onRetry}
      style={{
        padding: "8px 16px",
        backgroundColor: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      Retry
    </button>
  </div>
);

/**
 * Empty state
 */
const EmptyState = () => (
  <div style={{
    padding: "60px 20px",
    textAlign: "center",
    color: "#9ca3af",
  }}>
    <p style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</p>
    <p>No active downloads</p>
    <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>
      Start a download to see it here
    </p>
  </div>
);

const ActiveJobs = () => {
  const { jobs, loading, error, refresh } = useJobs('active', 3000); // Auto-refresh every 3s

  return (
    <div className="active-jobs-page">
      <div className="dashboard-padding">
        <h2 className="dashboard-title">Active Jobs</h2>
        <div className="dashboard-placeholder-card">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <button
              onClick={refresh}
              style={{
                padding: "8px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#f9fafb",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {loading && jobs.length === 0 && <LoadingSkeleton />}

          {error && <ErrorDisplay error={error} onRetry={refresh} />}

          {!loading && !error && jobs.length === 0 && <EmptyState />}

          {jobs.length > 0 && (
            <div className="jobs-list">
              {jobs.map((job) => (
                <JobCard key={job.job_id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveJobs;
