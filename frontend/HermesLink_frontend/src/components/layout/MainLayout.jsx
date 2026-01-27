import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../../styles/dashboard.css";

const MainLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we are on the landing page ("/")
  const isRoot = location.pathname === "/";

  // State to track if the intro transition has happened
  // If not root, we assume intro is done (e.g. refresh on inner page)
  const [introComplete, setIntroComplete] = useState(!isRoot);

  // Handle interaction to trigger intro
  const handleInteraction = () => {
    if (!introComplete) {
      setIntroComplete(true);
    }
  };

  // If we navigate away from root, ensure intro is marked complete
  useEffect(() => {
    if (!isRoot) {
      setIntroComplete(true);
    }
  }, [isRoot]);

  return (
    <div
      className={`layout-container ${
        introComplete
          ? isRoot
            ? "layout-hub"
            : "layout-active"
          : "layout-intro"
      }`}
      onClick={handleInteraction}
      onWheel={handleInteraction}>
      {/* Big Title: Centered in Intro, Top in Active */}
      <div className="layout-header">
        <h1
          className="app-title"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/");
            setIntroComplete(false);
          }}
          style={{ cursor: "pointer" }}>
          HermesLink
        </h1>
      </div>

      {/* Navbar: Hidden in Intro (or faded out), Visible Centered in Active */}
      <div className={`layout-nav ${introComplete ? "fade-in" : "hidden"}`}>
        <Navbar />
      </div>

      {/* Main Content: Hidden in Intro, Visible below Nav in Active */}
      {/* Main Content / Background Layer */}
      {isRoot ? (
        // On Landing Page (Hub), render children (Prism) as fixed background
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
          }}>
          {children}
        </div>
      ) : (
        // On App Pages, render content in flow
        <main
          className={`layout-content ${introComplete ? "fade-in-delayed" : "hidden"}`}>
          {children}
        </main>
      )}
    </div>
  );
};

export default MainLayout;
