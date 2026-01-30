import React from "react";
import "./ActiveJobs.css";
import Threads from "../../components/animated_components/threads/Threads";

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
      <div className="thread_bg" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Threads amplitude={1.7} distance={0} enableMouseInteraction={false} />
      </div>

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
