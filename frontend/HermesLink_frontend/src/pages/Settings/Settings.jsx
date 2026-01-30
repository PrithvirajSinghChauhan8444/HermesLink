import React from "react";
import "./Settings.css";

const Settings = () => {
  return (
    <div className="settings-page">
      <div className="dashboard-padding">
        <h2 className="dashboard-title">Settings</h2>
        <div className="dashboard-placeholder-card">
          {/* New Queue Form will go here as requested "page to make a new queue" */}
          <h3>Queue Configuration</h3>
          <p>Create and configure download queues.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
