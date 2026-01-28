import React from "react";
import Prism from "../../components/animated_components/landing_page/landing_bg";
import "./LandingPage.css";

const LandingPage = () => {
  // The LandingPage content itself is minimal now,
  // as MainLayout handles the Title/Nav.
  // This component basically serves as the "Pre-Interaction" placeholder.
  // Once interaction happens in MainLayout, the Title moves, Nav appears.
  // User then clicks Nav to go to /active, etc.

  return (
    <div className="landing-placeholder">
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Prism
          animationType="3drotate"
          timeScale={1.2}
          height={3}
          baseWidth={4}
          scale={2}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={2}
        />
      </div>
    </div>
  );
};

export default LandingPage;
