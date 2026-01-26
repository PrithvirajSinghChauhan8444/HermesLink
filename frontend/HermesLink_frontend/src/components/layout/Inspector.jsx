import React from "react";

const Inspector = () => {
  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div className="inspector-title-row">
          <span className="job-id text-mono">JOB-8291</span>
          <span className="job-type">MediaDownload</span>
        </div>
        <div className="inspector-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "45%" }}></div>
          </div>
          <div className="progress-meta">
            <span>45%</span>
            <span>2.1 MB/s</span>
            <span>ETA 4m</span>
          </div>
        </div>
      </div>

      <div className="inspector-tabs">
        <div className="tab active">Overview</div>
        <div className="tab">Logs</div>
        <div className="tab">Config</div>
        <div className="tab">History</div>
      </div>

      <div className="inspector-content">
        <div className="key-value-grid">
          <div className="kv-item">
            <label>Status</label>
            <span className="status-running">Running</span>
          </div>
          <div className="kv-item">
            <label>Started</label>
            <span>10:42:15 AM</span>
          </div>
          <div className="kv-item">
            <label>Duration</label>
            <span>00:12:44</span>
          </div>
          <div className="kv-item">
            <label>Retries</label>
            <span>0</span>
          </div>
        </div>

        <div className="log-preview text-mono">
          <div className="log-line text-secondary">
            10:42:15 [INFO] Job initialized
          </div>
          <div className="log-line text-secondary">
            10:42:16 [INFO] Resolving host...
          </div>
          <div className="log-line">10:42:18 [INFO] Connected to peer</div>
          <div className="log-line">10:42:19 [DATA] receiving chunks...</div>
        </div>
      </div>

      <div className="inspector-footer">
        <button className="btn-primary">Pause Job</button>
        <button className="btn-secondary">View Details</button>
      </div>
    </aside>
  );
};

export default Inspector;
