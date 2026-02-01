import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import Navbar from "./Navbar";
import "../../styles/dashboard.css";

import DecryptedText from "../animated_components/title/DecryptedText";
import GlassSurface from "../animated_components/glass_surface/GlassSurface";

// Page Imports
import LandingPage from "../../pages/LandingPage/LandingPage";
import ActiveJobs from "../../pages/ActiveJobs/ActiveJobs";
import QueueManagement from "../../pages/QueueManagement/QueueManagement";
import History from "../../pages/History/History";
import Settings from "../../pages/Settings/Settings";
import About from "../../pages/About/About";

const MainLayout = () => {
  // State to track the active view
  const [activeTab, setActiveTab] = useState("home");

  // Check if we are on the landing page
  const isRoot = activeTab === "home";

  // State to track if the intro transition has happened
  const [introComplete, setIntroComplete] = useState(!isRoot);
  // Track if navbar animation reached destination
  const [barAnimationDone, setBarAnimationDone] = useState(!isRoot);

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
      setBarAnimationDone(false); // Reset animation state when leaving root
    } else {
      setBarAnimationDone(false); // Reset when returning to root
    }
  }, [isRoot]);

  // Animation States for Navbar
  const hiddenState = {
    position: "fixed",
    bottom: "2rem", // Constant baseline
    top: "auto",
    left: "50%",
    x: "-50%",
    y: "-35vh", // Move UP for center/hidden
    zIndex: 1000,
    opacity: 0,
  };

  const bottomState = {
    position: "fixed",
    bottom: "2rem", // Constant baseline
    top: "auto",
    left: "50%",
    x: "-50%",
    y: "0", // Stay at bottom
    zIndex: 1000,
    opacity: 1,
  };

  const centerState = {
    position: "fixed",
    bottom: "2rem", // Constant baseline
    top: "auto",
    left: "50%",
    x: "-50%",
    y: "-35vh", // Move UP (negative Y) to center
    zIndex: 1000,
    opacity: 1,
  };

  // Determine target state for Navbar
  let targetState;
  if (isRoot) {
    if (introComplete) {
      targetState = centerState;
    } else {
      targetState = hiddenState;
    }
  } else {
    targetState = bottomState;
  }

  // Render the valid component based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case "active":
        return <ActiveJobs />;
      case "queue":
        return <QueueManagement />;
      case "history":
        return <History />;
      case "settings":
        return <Settings />;
      case "about":
        return <About />;
      case "home":
      default:
        return <LandingPage />;
    }
  };

  return (
    <div
      className={`layout-container ${introComplete
        ? isRoot
          ? "layout-hub"
          : "layout-active"
        : "layout-intro"
        }`}
      onClick={handleInteraction}
      onWheel={handleInteraction}>
      {/* Big Title: Centered in Intro. Only visible on Landing Page (isRoot) */}
      {isRoot && (
        <div className="layout-header">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2rem",
            }}>
            <h1
              className="app-title"
              onClick={(e) => {
                e.stopPropagation();
                // No navigation needed if we are already root, but good for resetting state
                setActiveTab("home");
                setIntroComplete(false);
              }}
              style={{ cursor: "pointer" }}>
              <GlassSurface
                scale={1.2}
                borderRadius={55}
                width="fit-content"
                height="fit-content"
                displace={0.5}
                distortionScale={-180}
                redOffset={0}
                greenOffset={10}
                blueOffset={20}
                brightness={50}
                opacity={0.93}
                mixBlendMode="screen">
                <DecryptedText
                  text="HermesLink"
                  animateOn="view"
                  revealDirection="center"
                  sequential={true}
                  speed={120}
                  maxIterations={20}
                />
              </GlassSurface>
            </h1>
          </div>
        </div>
      )}      {/* Navbar: Single instance, animated */}
      <Navbar
        animate={targetState}
        onAnimationComplete={() => setBarAnimationDone(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      {/* We use AnimatePresence to handle transitions between tabs */}
      {isRoot ? (
        // Landing Page is special, it acts as background
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
          }}>
          {renderContent()}
        </div>
      ) : (
        // Other pages rendered in flow with transitions
        <main
          className={`layout-content ${introComplete && barAnimationDone ? "fade-in-delayed" : "hidden"}`}
          style={{ position: "relative", width: "100%", height: "100%" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", height: "100%" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      )}
    </div>
  );
};

export default MainLayout;
