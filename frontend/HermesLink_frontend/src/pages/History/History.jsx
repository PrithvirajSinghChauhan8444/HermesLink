import React from "react";
import { useJobs, formatDate, extractFilename } from "../../hooks/useJobs";

import "./History.css";

/**
 * State badge component for history states
 */
const StateBadge = ({ state }) => {
  const stateColors = {
    COMPLETED: { bg: "#d1fae5", color: "#065f46" },
    FAILED: { bg: "#fee2e2", color: "#991b1b" },
    STOPPED: { bg: "#e5e7eb", color: "#374151" },
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
 * History item component
 */
const HistoryItem = ({ job }) => {
  const filename = extractFilename(job);

  return (
    <div className="history-item" style={{
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(10px)",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "12px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
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
          <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
            {job.engine_config?.type?.toUpperCase()} • {formatDate(job.updated_at)}
          </p>
          {job.error_reason && (
            <p style={{
              margin: "8px 0 0",
              fontSize: "0.75rem",
              color: "#f87171",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              ⚠️ {job.error_reason.substring(0, 80)}...
            </p>
          )}
        </div>
        <StateBadge state={job.state} />
      </div>
    </div>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton = () => (
  <div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          height: "80px",
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
    <p style={{ fontSize: "2rem", marginBottom: "8px" }}>📝</p>
    <p>No download history yet</p>
    <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>
      Completed, failed, and stopped downloads will appear here
    </p>
  </div>
);

/**
 * Stats summary component
 */
const StatsSummary = ({ jobs }) => {
  const completed = jobs.filter(j => j.state === "COMPLETED").length;
  const failed = jobs.filter(j => j.state === "FAILED").length;
  const stopped = jobs.filter(j => j.state === "STOPPED").length;

  return (
    <div style={{
      display: "flex",
      gap: "12px",
      marginBottom: "16px",
      scale: "1.2",
      flexWrap: "wrap",
    }}>
      <div style={{
        padding: "10px 16px",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderRadius: "10px",
        border: "1px solid rgba(16, 185, 129, 0.2)",
      }}>
        <span style={{ color: "#10b981", fontWeight: "600" }}>{completed}</span>
        <span style={{ color: "#9ca3af", marginLeft: "8px", fontSize: "0.8rem" }}>Completed</span>
      </div>
      <div style={{
        padding: "10px 16px",
        backgroundColor: "rgba(248, 113, 113, 0.1)",
        borderRadius: "10px",
        border: "1px solid rgba(248, 113, 113, 0.2)",
      }}>
        <span style={{ color: "#f87171", fontWeight: "600" }}>{failed}</span>
        <span style={{ color: "#9ca3af", marginLeft: "8px", fontSize: "0.8rem" }}>Failed</span>
      </div>
      <div style={{
        padding: "10px 16px",
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        borderRadius: "10px",
        border: "1px solid rgba(156, 163, 175, 0.2)",
      }}>
        <span style={{ color: "#9ca3af", fontWeight: "600" }}>{stopped}</span>
        <span style={{ color: "#9ca3af", marginLeft: "8px", fontSize: "0.8rem" }}>Stopped</span>
      </div>
    </div>
  );
};

const History = () => {
  const { jobs, loading, error, refresh } = useJobs('history');

  return (
    <div className="history-page">
      <div className="dashboard-padding">
        <h2 className="dashboard-title">Process History</h2>
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
            <>
              <StatsSummary jobs={jobs} />
              <div className="history-list">
                {jobs.map((job) => (
                  <HistoryItem key={job.job_id} job={job} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
