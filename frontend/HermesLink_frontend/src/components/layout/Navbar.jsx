import React from "react";

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
  activeTab,
  onTabChange,
}) => {


  const items = [
    {
      icon: <VscHome size={18} />,
      label: "Home",
      onClick: () => onTabChange("home"),
    },
    {
      icon: <VscPlay size={18} />,
      label: "Active Jobs",
      onClick: () => onTabChange("active"),
    },
    {
      icon: <VscListOrdered size={18} />,
      label: "Queue",
      onClick: () => onTabChange("queue"),
    },
    {
      icon: <VscHistory size={18} />,
      label: "History",
      onClick: () => onTabChange("history"),
    },
    {
      icon: <VscSettingsGear size={18} />,
      label: "Settings",
      onClick: () => onTabChange("settings"),
    },
    {
      icon: <VscInfo size={18} />,
      label: "About",
      onClick: () => onTabChange("about"),
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
