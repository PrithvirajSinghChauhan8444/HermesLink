import React from "react";

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo-text">HermesLink</h1>
      </div>

      <div className="sidebar-section">
        <div className="nav-item active">
          <span className="icon">■</span>
          <span className="label">All Jobs</span>
        </div>
      </div>

      <div className="sidebar-section mt-4">
        <h3 className="section-title">QUEUES</h3>
        <div className="queue-list">
          <div className="queue-item">
            <span className="queue-name">High Priority</span>
            <span className="queue-badge">4</span>
          </div>
          <div className="queue-item">
            <span className="queue-name">Standard</span>
            <span className="queue-badge muted">0</span>
          </div>
          <div className="queue-item active">
            <span className="queue-name">Background</span>
            <span className="queue-badge">12</span>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="status-dot running"></span>
          <span className="status-text">Scheduler Running</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
