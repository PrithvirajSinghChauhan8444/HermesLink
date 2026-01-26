import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Inspector from "./Inspector";
import "../../styles/dashboard.css";

const MainLayout = ({ children }) => {
  return (
    <div className="layout-grid">
      <Sidebar />
      <div className="layout-main">
        <Header />
        <main className="layout-content">{children}</main>
      </div>
      <Inspector />
    </div>
  );
};

export default MainLayout;
