import React from "react";
import Navbar from "../../components/layout/Navbar";
import { bottomState } from "../../config/navbarStates";
import "./History.css";

const History = () => {
  return (
    <div className="history-page">
      <div className="dashboard-padding">
        <h2 className="dashboard-title">Process History</h2>
        <div className="dashboard-placeholder-card">
          {/* History list will go here */}
          History Log Placeholder
        </div>
      </div>
      <Navbar animate={bottomState} />
    </div>
  );
};

export default History;
