import React from "react";
import ColorBends from "../../components/animated_components/color_bend/ColorBends";
import "../../styles/dashboard.css";

const LandingPage = () => {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        // zIndex is handled by parent
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
  );
};

export default LandingPage;
