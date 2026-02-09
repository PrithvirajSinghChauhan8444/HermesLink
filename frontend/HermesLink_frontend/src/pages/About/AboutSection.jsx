import React from "react";
import { motion } from "motion/react";
import {
    AnimatedSection,
    StaggerContainer,
    StaggerItem,
    FloatingElement,
} from "../../components/animations/ScrollAnimations";
import "./AboutSection.css";

const features = [
    {
        icon: "⚡",
        title: "Lightning Fast",
        description: "Optimized download engine with multi-threaded connections",
    },
    {
        icon: "📊",
        title: "Real-time Analytics",
        description: "Live progress tracking with detailed statistics",
    },
    {
        icon: "🎯",
        title: "Smart Queuing",
        description: "Intelligent queue management with priority support",
    },
    {
        icon: "🔒",
        title: "Secure Downloads",
        description: "Encrypted connections and integrity verification",
    },
    {
        icon: "🌐",
        title: "Protocol Support",
        description: "HTTP, HTTPS, FTP, BitTorrent, and more",
    },
    {
        icon: "🔄",
        title: "Resume Support",
        description: "Pause and resume downloads anytime",
    },
];

const techStack = [
    { name: "React", icon: "⚛️" },
    { name: "Python", icon: "🐍" },
    { name: "FastAPI", icon: "🚀" },
    { name: "SQLite", icon: "💾" },
];

const AboutSection = () => {
    return (
        <div className="section-container about-section">
            <div className="section-inner">
                <AnimatedSection className="section-header">
                    <h2 className="section-title">About HermesLink</h2>
                    <p className="section-subtitle">
                        A modern, powerful download manager built for speed and reliability
                    </p>
                </AnimatedSection>

                {/* Version Badge */}
                <AnimatedSection delay={0.2} className="version-badge-wrapper">
                    <div className="version-badge">
                        <span className="version-dot" />
                        <span>Version 1.0.0</span>
                        <span className="version-separator">|</span>
                        <span>MIT License</span>
                    </div>
                </AnimatedSection>

                {/* Features Grid */}
                <StaggerContainer className="features-grid" staggerDelay={0.08}>
                    {features.map((feature) => (
                        <StaggerItem key={feature.title}>
                            <motion.div
                                className="feature-card glass-card"
                                whileHover={{ y: -5, scale: 1.02 }}
                            >
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon">{feature.icon}</span>
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </StaggerContainer>

                {/* Tech Stack */}
                <AnimatedSection delay={0.4}>
                    <div className="tech-section">
                        <h3 className="tech-title">Built With</h3>
                        <div className="tech-stack">
                            {techStack.map((tech) => (
                                <motion.div
                                    key={tech.name}
                                    className="tech-item"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span className="tech-icon">{tech.icon}</span>
                                    <span className="tech-name">{tech.name}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* Footer */}
                <AnimatedSection delay={0.5} className="about-footer">
                    <p>Made with ❤️ by the HermesLink Team</p>
                </AnimatedSection>
            </div>

            {/* Decorative Elements */}
            <FloatingElement className="about-orb about-orb-1" duration={8} distance={25} />
            <FloatingElement className="about-orb about-orb-2" duration={10} distance={20} />
        </div>
    );
};

export default AboutSection;
