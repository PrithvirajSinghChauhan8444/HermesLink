import React from "react";

const About = () => {
  return (
    <div className="dashboard-padding">
      <h2 className="dashboard-title">About HermesLink</h2>
      <div className="dashboard-placeholder-card">
        <h3>Features</h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          <li>
            <strong>Active Monitoring:</strong> Real-time job tracking.
          </li>
          <li>
            <strong>Multi-Queue Support:</strong> Organize downloads
            efficiently.
          </li>
          <li>
            <strong>History:</strong> Comprehensive log of past activities.
          </li>
          <li>
            <strong>Unified Control:</strong> Manage Media, P2P, and Direct
            downloads in one place.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default About;
