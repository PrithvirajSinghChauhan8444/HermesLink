import React from "react";
import { motion } from "motion/react";
import {
    AnimatedSection,
    StaggerContainer,
    StaggerItem,
} from "../../components/animations/ScrollAnimations";
import "./QueueSection.css";

const queueTypes = [
    {
        id: "download",
        name: "Download Queue",
        icon: "⬇️",
        description: "Standard HTTP/HTTPS downloads",
        count: 0,
        gradient: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    },
    {
        id: "torrent",
        name: "Torrent Queue",
        icon: "🔗",
        description: "BitTorrent protocol downloads",
        count: 0,
        gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)",
    },
    {
        id: "media",
        name: "Media Queue",
        icon: "🎬",
        description: "Video & audio streaming downloads",
        count: 0,
        gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    },
    {
        id: "batch",
        name: "Batch Queue",
        icon: "📦",
        description: "Bulk download operations",
        count: 0,
        gradient: "linear-gradient(135deg, #10b981, #06b6d4)",
    },
];

const QueueCard = ({ queue, index }) => (
    <motion.div
        className="queue-card glass-card"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ scale: 1.03, y: -5 }}
    >
        <div className="queue-icon-wrapper" style={{ background: queue.gradient }}>
            <span className="queue-icon">{queue.icon}</span>
        </div>
        <div className="queue-info">
            <h3 className="queue-name">{queue.name}</h3>
            <p className="queue-description">{queue.description}</p>
        </div>
        <div className="queue-stats">
            <span className="queue-count">{queue.count}</span>
            <span className="queue-label">items</span>
        </div>
    </motion.div>
);

const QueueSection = () => {
    return (
        <div className="section-container queue-section">
            <div className="section-inner">
                <AnimatedSection className="section-header">
                    <h2 className="section-title">Queue Management</h2>
                    <p className="section-subtitle">
                        Organize and prioritize your downloads with intelligent queues
                    </p>
                </AnimatedSection>

                <StaggerContainer className="queues-grid" staggerDelay={0.1}>
                    {queueTypes.map((queue, index) => (
                        <StaggerItem key={queue.id}>
                            <QueueCard queue={queue} index={index} />
                        </StaggerItem>
                    ))}
                </StaggerContainer>

                <AnimatedSection delay={0.5}>
                    <div className="queue-actions">
                        <motion.button
                            className="btn btn-primary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span>➕</span>
                            <span>Create New Queue</span>
                        </motion.button>
                    </div>
                </AnimatedSection>
            </div>
        </div>
    );
};

export default QueueSection;
