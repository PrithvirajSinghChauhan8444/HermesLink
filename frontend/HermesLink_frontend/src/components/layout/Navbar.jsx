import React from "react";
import {
  VscHome,
  VscPlay,
  VscListOrdered,
  VscHistory,
  VscSettingsGear,
  VscInfo,
} from "react-icons/vsc";
import Dock from "../animated_components/dock/Dock";

const Navbar = ({ style, className, activeSection, onNavigate }) => {
  const items = [
    {
      icon: <VscHome size={18} />,
      label: "Home",
      onClick: () => onNavigate("home"),
      isActive: activeSection === "home",
    },
    {
      icon: <VscPlay size={18} />,
      label: "Active Jobs",
      onClick: () => onNavigate("active"),
      isActive: activeSection === "active",
    },
    {
      icon: <VscListOrdered size={18} />,
      label: "Queue",
      onClick: () => onNavigate("queue"),
      isActive: activeSection === "queue",
    },
    {
      icon: <VscHistory size={18} />,
      label: "History",
      onClick: () => onNavigate("history"),
      isActive: activeSection === "history",
    },
    {
      icon: <VscSettingsGear size={18} />,
      label: "Settings",
      onClick: () => onNavigate("settings"),
      isActive: activeSection === "settings",
    },
    {
      icon: <VscInfo size={18} />,
      label: "About",
      onClick: () => onNavigate("about"),
      isActive: activeSection === "about",
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
    <div style={style || defaultStyle} className={className}>
      <Dock
        items={items}
        panelHeight={68}
        baseItemSize={50}
        magnification={80}
      />
    </div>
  );
};

export default Navbar;
