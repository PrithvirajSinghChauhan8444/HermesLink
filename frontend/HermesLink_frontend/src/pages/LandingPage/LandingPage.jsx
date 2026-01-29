import React from "react";

import ColorBends from "../../components/animated_components/color_bend/ColorBends";

const LandingPage = () => {
  // The LandingPage content itself is minimal now,
  // as MainLayout handles the Title/Nav.
  // This component basically serves as the "Pre-Interaction" placeholder.
  // Once interaction happens in MainLayout, the Title moves, Nav appears.
  // User then clicks Nav to go to /active, etc.

  return (
    <div className="landing-placeholder">
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
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
    </div>
  );
};

export default LandingPage;
