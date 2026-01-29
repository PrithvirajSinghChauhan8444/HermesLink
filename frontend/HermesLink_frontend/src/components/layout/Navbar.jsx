import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  VscHome,
  VscPlay,
  VscListOrdered,
  VscHistory,
  VscSettingsGear,
  VscInfo,
} from "react-icons/vsc";
import Dock from "../animated_components/dock/Dock";

const Navbar = ({
  style,
  className,
  animate,
  initial,
  onAnimationComplete,
}) => {
  const navigate = useNavigate();

  const items = [
    {
      icon: <VscHome size={18} />,
      label: "Home",
      onClick: () => navigate("/"),
    },
    {
      icon: <VscPlay size={18} />,
      label: "Active Jobs",
      onClick: () => navigate("/active"),
    },
    {
      icon: <VscListOrdered size={18} />,
      label: "Queue",
      onClick: () => navigate("/queue"),
    },
    {
      icon: <VscHistory size={18} />,
      label: "History",
      onClick: () => navigate("/history"),
    },
    {
      icon: <VscSettingsGear size={18} />,
      label: "Settings",
      onClick: () => navigate("/settings"),
    },
    {
      icon: <VscInfo size={18} />,
      label: "About",
      onClick: () => navigate("/about"),
    },
  ];

  const defaultStyle = {
    position: "fixed",
    bottom: "2rem",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1000,
  };

  return (
    <motion.div
      initial={initial || false}
      animate={animate || style || defaultStyle}
      style={!animate ? style || defaultStyle : undefined}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      onAnimationComplete={onAnimationComplete}
      className={className}>
      <Dock
        items={items}
        panelHeight={68}
        baseItemSize={50}
        magnification={80}
      />
    </motion.div>
  );
};

export default Navbar;
