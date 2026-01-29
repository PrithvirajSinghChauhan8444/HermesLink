import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../../styles/dashboard.css";

import DecryptedText from "../animated_components/title/DecryptedText";
import GlassSurface from "../animated_components/glass_surface/GlassSurface";

const MainLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we are on the landing page ("/")
  const isRoot = location.pathname === "/";

  // State to track if the intro transition has happened
  // If not root, we assume intro is done (e.g. refresh on inner page)
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
      setBarAnimationDone(false); // Reset when returning to root (optional)
    }
  }, [isRoot]);

  // Animation States
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
    y: "0px", // Stay at bottom
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

  // Determine target state
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
              navigate("/");
              setIntroComplete(false);
            }}
            style={{ cursor: "pointer" }}>
            {isRoot ? (
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
            ) : (
              "HermesLink"
            )}
          </h1>
        </div>
      </div>

      {/* Navbar: Single instance, animated */}
      <Navbar
        animate={targetState}
        onAnimationComplete={() => setBarAnimationDone(true)}
      />

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
          className={`layout-content ${introComplete && barAnimationDone ? "fade-in-delayed" : "hidden"}`}>
          {children}
        </main>
      )}
    </div>
  );
};

export default MainLayout;
