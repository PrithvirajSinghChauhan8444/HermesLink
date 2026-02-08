import React, { useState } from "react";
import { useJobs, formatDate, extractFilename } from "../../hooks/useJobs";
import Silk from "../../components/animated_components/silk_bg/Silk";

import "./History.css";

/**
 * Queue filter categories
 */
const QUEUE_FILTERS = [
  { id: "all", label: "All History", icon: "📋" },
  { id: "download", label: "Download Queue", icon: "⬇️" },
  { id: "processing", label: "Processing Queue", icon: "⚙️" },
  { id: "completed", label: "Completed", icon: "✅" },
  { id: "failed", label: "Failed", icon: "❌" },
];

/**
 * Queue Navigation Sidebar
 */
const QueueNav = ({ activeFilter, onFilterChange, jobCounts }) => {
  return (
    <nav className="history-nav">
      <h3 className="history-nav-title">Queues</h3>
      <ul className="history-nav-list">
        {QUEUE_FILTERS.map((filter) => (
          <li key={filter.id}>
            <button
              className={`history-nav-item ${activeFilter === filter.id ? "active" : ""}`}
              onClick={() => onFilterChange(filter.id)}
            >
              <span className="history-nav-icon">{filter.icon}</span>
              <span className="history-nav-label">{filter.label}</span>
              {jobCounts[filter.id] !== undefined && (
                <span className="history-nav-count">{jobCounts[filter.id]}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/**
 * State badge component for history states
 */
const StateBadge = ({ state }) => {
  const stateStyles = {
    COMPLETED: "badge-success",
    FAILED: "badge-danger",
    STOPPED: "badge-muted",
  };

  return (
    <span className={`state-badge ${stateStyles[state] || "badge-muted"}`}>
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
    <div className="history-item">
      <div className="history-item-content">
        <div className="history-item-info">
          <h4 className="history-filename">{filename}</h4>
          <p className="history-meta">
            <span className="history-queue">{job.engine_config?.type?.toUpperCase()}</span>
            <span className="history-separator">•</span>
            <span className="history-date">{formatDate(job.updated_at)}</span>
          </p>
          {job.error_reason && (
            <p className="history-error">
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
  <div className="history-skeleton-container">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="history-skeleton" />
    ))}
  </div>
);

/**
 * Error display
 */
const ErrorDisplay = ({ error, onRetry }) => (
  <div className="history-error-display">
    <p>⚠️ {error}</p>
    <button onClick={onRetry} className="history-retry-btn">
      Retry
    </button>
  </div>
);

/**
 * Empty state
 */
const EmptyState = ({ filter }) => (
  <div className="history-empty">
    <p className="history-empty-icon">📝</p>
    <p className="history-empty-title">No items found</p>
    <p className="history-empty-subtitle">
      {filter === "all"
        ? "Completed, failed, and stopped downloads will appear here"
        : `No items in ${filter} queue`}
    </p>
  </div>
);

/**
 * List Header with stats
 */
const ListHeader = ({ jobs, onRefresh }) => {
  const completed = jobs.filter(j => j.state === "COMPLETED").length;
  const failed = jobs.filter(j => j.state === "FAILED").length;
  const total = jobs.length;

  return (
    <div className="history-list-header">
      <div className="history-stats">
        <span className="history-stat">
          <strong>{total}</strong> Total
        </span>
        <span className="history-stat success">
          <strong>{completed}</strong> Completed
        </span>
        <span className="history-stat danger">
          <strong>{failed}</strong> Failed
        </span>
      </div>
      <button onClick={onRefresh} className="history-refresh-btn">
        🔄 Refresh
      </button>
    </div>
  );
};

/**
 * Main History Component
 */
const History = () => {
  const { jobs, loading, error, refresh } = useJobs('history');
  const [activeFilter, setActiveFilter] = useState("all");

  // Filter jobs based on active filter
  const filteredJobs = jobs.filter(job => {
    switch (activeFilter) {
      case "completed":
        return job.state === "COMPLETED";
      case "failed":
        return job.state === "FAILED";
      case "download":
        return job.engine_config?.type === "download";
      case "processing":
        return job.engine_config?.type === "processing";
      default:
        return true;
    }
  });

  // Calculate job counts for nav badges
  const jobCounts = {
    all: jobs.length,
    completed: jobs.filter(j => j.state === "COMPLETED").length,
    failed: jobs.filter(j => j.state === "FAILED").length,
    download: jobs.filter(j => j.engine_config?.type === "download").length,
    processing: jobs.filter(j => j.engine_config?.type === "processing").length,
  };

  return (
    <div className="history-page">
      {/* Silk Background */}
      <div className="history-silk-bg">
        <Silk
          speed={3}
          scale={1}
          color="#939393ff"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>

      <div className="history-container">
        <h2 className="history-title">Process History</h2>

        <div className="history-split-container">
          {/* Left Column - Queue Navigation (25%) */}
          <aside className="history-sidebar">
            <QueueNav
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              jobCounts={jobCounts}
            />
          </aside>

          {/* Right Column - History List (75%) */}
          <main className="history-main">
            {/* Header with stats and refresh */}
            <ListHeader jobs={filteredJobs} onRefresh={refresh} />

            {/* Content area */}
            <div className="history-content">
              {loading && jobs.length === 0 && <LoadingSkeleton />}

              {error && <ErrorDisplay error={error} onRetry={refresh} />}

              {!loading && !error && filteredJobs.length === 0 && (
                <EmptyState filter={activeFilter} />
              )}

              {filteredJobs.length > 0 && (
                <div className="history-list">
                  {filteredJobs.map((job) => (
                    <HistoryItem key={job.job_id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default History;
