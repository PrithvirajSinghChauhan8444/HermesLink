import React from "react";
import Navbar from "../../components/layout/Navbar";
import { bottomState } from "../../config/navbarStates";
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
      <Navbar animate={bottomState} />
    </div>
  );
};

export default Settings;
