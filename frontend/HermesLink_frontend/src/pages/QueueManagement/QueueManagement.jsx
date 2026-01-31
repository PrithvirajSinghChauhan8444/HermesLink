import React from "react";
import Navbar from "../../components/layout/Navbar";
import { bottomState } from "../../config/navbarStates";
import "./QueueManagement.css";

const QueueManagement = () => {
  return (
    <div className="queue-page">
      <div className="dashboard-padding">
        <h2 className="dashboard-title">Queue Management</h2>
        <div className="dashboard-placeholder-card">
          {/* Queue list and management actions will go here */}
          Queue List Placeholder
        </div>
      </div>
      <Navbar animate={bottomState} />
    </div>
  );
};

export default QueueManagement;
