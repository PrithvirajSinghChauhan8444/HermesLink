import React from "react";
import { motion } from "motion/react";
import {
    AnimatedSection,
    StaggerContainer,
    StaggerItem,
    FloatingElement,
} from "../../components/animations/ScrollAnimations";
import "./LandingSection.css";

const LandingSection = ({ onNavigate }) => {
    return (
        <div className="landing-section">
            {/* Hero Content */}
            <div className="hero-container">
                {/* Animated Title */}
                <AnimatedSection delay={0.2}>
                    <motion.div
                        className="hero-badge"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <span className="badge-dot" />
                        <span>Download Manager Reimagined</span>
                    </motion.div>
                </AnimatedSection>

                <AnimatedSection delay={0.4}>
                    <h1 className="hero-title">
                        <span className="title-line">Meet</span>
                        <span className="title-gradient">HermesLink</span>
                    </h1>
                </AnimatedSection>

                <AnimatedSection delay={0.6}>
                    <p className="hero-description">
                        A blazing-fast, intelligent download manager that orchestrates your downloads
                        with precision. Queue management, real-time progress, and seamless control.
                    </p>
                </AnimatedSection>

                <AnimatedSection delay={0.8}>
                    <div className="hero-actions">
                        <motion.button
                            className="btn btn-primary hero-btn"
                            onClick={() => onNavigate("active")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span>Explore Dashboard</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </motion.button>
                        <motion.button
                            className="btn btn-secondary hero-btn"
                            onClick={() => onNavigate("about")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Learn More
                        </motion.button>
                    </div>
                </AnimatedSection>

                {/* Feature highlights */}
                <StaggerContainer className="hero-features" delayChildren={1}>
                    <StaggerItem>
                        <div className="feature-chip">
                            <span className="feature-icon">⚡</span>
                            <span>Lightning Fast</span>
                        </div>
                    </StaggerItem>
                    <StaggerItem>
                        <div className="feature-chip">
                            <span className="feature-icon">📊</span>
                            <span>Real-time Analytics</span>
                        </div>
                    </StaggerItem>
                    <StaggerItem>
                        <div className="feature-chip">
                            <span className="feature-icon">🎯</span>
                            <span>Smart Queuing</span>
                        </div>
                    </StaggerItem>
                </StaggerContainer>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                className="scroll-indicator"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <span>Scroll to explore</span>
                <div className="scroll-arrow">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                </div>
            </motion.div>

            {/* Decorative elements */}
            <FloatingElement className="hero-orb hero-orb-1" duration={6} distance={30} />
            <FloatingElement className="hero-orb hero-orb-2" duration={8} distance={20} />
        </div>
    );
};

export default LandingSection;
