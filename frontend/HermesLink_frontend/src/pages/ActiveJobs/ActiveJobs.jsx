import React from "react";

import "./ActiveJobs.css";

const ActiveJobs = () => {
  return (
    <div
      className="active-jobs-page"
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}>
      <div
        className="dashboard-padding"
        style={{ position: "relative", zIndex: 1 }}>
        <h2 className="dashboard-title">Active Jobs</h2>
        <div className="dashboard-placeholder-card">
          {/* Active jobs visualization will go here */}
          Job Feed Placeholder
        </div>
      </div>
    </div>
  );
};

export default ActiveJobs;
