import React from "react";
import Prism from "../components/animated_components/landing_page/landing_bg";

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
          animationType="hover"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div>
    </div>
  );
};

export default LandingPage;
