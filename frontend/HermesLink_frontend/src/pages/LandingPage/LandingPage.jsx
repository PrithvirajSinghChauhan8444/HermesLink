import React, { useState } from "react";
import ColorBends from "../../components/animated_components/color_bend/ColorBends";
import Navbar from "../../components/layout/Navbar";
import GlassSurface from "../../components/animated_components/glass_surface/GlassSurface";
import DecryptedText from "../../components/animated_components/title/DecryptedText";
import "../../styles/dashboard.css"; // Ensure styles are available
import { hiddenState, centerState } from "../../config/navbarStates";

const LandingPage = () => {
  const [introComplete, setIntroComplete] = useState(false);

  // Handle interaction to trigger intro
  const handleInteraction = () => {
    if (!introComplete) {
      setIntroComplete(true);
    }
  };



  return (
    <div
      className={`layout-container ${introComplete ? "layout-hub" : "layout-intro"}`}
      onClick={handleInteraction}
      onWheel={handleInteraction}
      style={{ overflow: "hidden" }}>
      {/* Background - ColorBends */}
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -1,
        }}>
        <ColorBends
          colors={[
            "#ff453a", // Red
            "#32d74b", // Green
            "#0a84ff", // Blue
          ]}
          rotation={0}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0.1}
          transparent
          autoRotate={1}
          color=""
        />
      </div>

      {/* Title Header */}
      <div className="layout-header">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2rem",
          }}>
          <h1 className="app-title">
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
      {/* Navbar - animated based on state */}
      <Navbar
        initial={hiddenState}
        animate={introComplete ? centerState : hiddenState}
      />
    </div>
  );
};

export default LandingPage;
