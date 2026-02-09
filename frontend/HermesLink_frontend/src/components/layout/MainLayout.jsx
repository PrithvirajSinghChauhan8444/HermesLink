import React from "react";
import Navbar from "./Navbar";
import "../../styles/dashboard.css";
import { useTheme } from "../../hooks/ThemeContext";
import ThemeToggle from "../common/ThemeToggle";
import { useScrollNavigation } from "../../hooks/useScrollNavigation";
import { motion } from "motion/react";

// Page Imports
import LandingSection from "../../pages/LandingPage/LandingSection";
import ActiveJobsSection from "../../pages/ActiveJobs/ActiveJobsSection";
import QueueSection from "../../pages/QueueManagement/QueueSection";
import HistorySection from "../../pages/History/HistorySection";
import SettingsSection from "../../pages/Settings/SettingsSection";
import AboutSection from "../../pages/About/AboutSection";

// Section IDs for navigation
const SECTION_IDS = ["home", "active", "queue", "history", "settings", "about"];

const MainLayout = () => {
  const { theme } = useTheme();
  const {
    activeSection,
    scrollToSection,
    scrollContainerRef,
    setSectionRef,
  } = useScrollNavigation(SECTION_IDS);

  // Navbar style - always at bottom
  const navbarStyle = {
    position: "fixed",
    bottom: "2rem",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1000,
  };

  return (
    <div className="main-layout">
      {/* Animated mesh background */}
      <div className="mesh-background" />

      {/* Floating orbs for visual depth */}
      <div className="floating-orbs">
        <motion.div
          className="orb orb-1"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="orb orb-2"
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="orb orb-3"
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Scroll Container */}
      <div className="scroll-container" ref={scrollContainerRef}>
        {/* Landing Section */}
        <section
          id="home"
          ref={setSectionRef("home")}
          className="scroll-section"
        >
          <LandingSection onNavigate={scrollToSection} />
        </section>

        {/* Active Jobs Section */}
        <section
          id="active"
          ref={setSectionRef("active")}
          className="scroll-section"
        >
          <ActiveJobsSection />
        </section>

        {/* Queue Management Section */}
        <section
          id="queue"
          ref={setSectionRef("queue")}
          className="scroll-section"
        >
          <QueueSection />
        </section>

        {/* History Section */}
        <section
          id="history"
          ref={setSectionRef("history")}
          className="scroll-section"
        >
          <HistorySection />
        </section>

        {/* Settings Section */}
        <section
          id="settings"
          ref={setSectionRef("settings")}
          className="scroll-section"
        >
          <SettingsSection />
        </section>

        {/* About Section */}
        <section
          id="about"
          ref={setSectionRef("about")}
          className="scroll-section"
        >
          <AboutSection />
        </section>
      </div>

      {/* Navbar */}
      <Navbar
        style={navbarStyle}
        activeSection={activeSection}
        onNavigate={scrollToSection}
      />
    </div>
  );
};

export default MainLayout;
