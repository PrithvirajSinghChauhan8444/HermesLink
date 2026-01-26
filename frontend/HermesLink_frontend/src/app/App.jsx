import React from "react";
import MainLayout from "../components/layout/MainLayout";

function App() {
  return (
    <MainLayout>
      <div className="dashboard-padding">
        <h2 className="dashboard-title">Active Jobs</h2>
        <div className="dashboard-placeholder-card">Job Feed Placeholder</div>
      </div>
    </MainLayout>
  );
}

export default App;
