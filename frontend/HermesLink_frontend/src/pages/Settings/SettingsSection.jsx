import React from "react";
import { motion } from "motion/react";
import {
    AnimatedSection,
    StaggerContainer,
    StaggerItem,
} from "../../components/animations/ScrollAnimations";
import "./SettingsSection.css";

const settingsGroups = [
    {
        title: "Download Settings",
        icon: "⬇️",
        settings: [
            { label: "Default Download Path", value: "~/Downloads", type: "path" },
            { label: "Simultaneous Downloads", value: "3", type: "number" },
            { label: "Auto-start Downloads", value: true, type: "toggle" },
        ],
    },
    {
        title: "Network Settings",
        icon: "🌐",
        settings: [
            { label: "Bandwidth Limit", value: "Unlimited", type: "select" },
            { label: "Proxy Configuration", value: "None", type: "select" },
            { label: "Connection Timeout", value: "30s", type: "text" },
        ],
    },
    {
        title: "Notification Settings",
        icon: "🔔",
        settings: [
            { label: "Download Complete", value: true, type: "toggle" },
            { label: "Download Failed", value: true, type: "toggle" },
            { label: "Sound Alerts", value: false, type: "toggle" },
        ],
    },
];

const SettingItem = ({ setting }) => (
    <div className="setting-item">
        <span className="setting-label">{setting.label}</span>
        <div className="setting-control">
            {setting.type === "toggle" ? (
                <motion.div
                    className={`toggle ${setting.value ? "active" : ""}`}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="toggle-thumb" />
                </motion.div>
            ) : (
                <span className="setting-value">{setting.value}</span>
            )}
        </div>
    </div>
);

const SettingsGroup = ({ group, index }) => (
    <motion.div
        className="settings-group gradient-card"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.15 }}
    >
        <div className="group-header">
            <span className="group-icon">{group.icon}</span>
            <h3 className="group-title">{group.title}</h3>
        </div>
        <div className="group-settings">
            {group.settings.map((setting, i) => (
                <SettingItem key={i} setting={setting} />
            ))}
        </div>
    </motion.div>
);

const SettingsSection = () => {
    return (
        <div className="section-container settings-section">
            <div className="section-inner">
                <AnimatedSection className="section-header">
                    <h2 className="section-title">Settings</h2>
                    <p className="section-subtitle">
                        Customize HermesLink to match your workflow
                    </p>
                </AnimatedSection>

                <div className="settings-grid">
                    {settingsGroups.map((group, index) => (
                        <SettingsGroup key={group.title} group={group} index={index} />
                    ))}
                </div>

                <AnimatedSection delay={0.5} className="settings-actions">
                    <motion.button
                        className="btn btn-secondary"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Reset to Defaults
                    </motion.button>
                    <motion.button
                        className="btn btn-primary"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Save Changes
                    </motion.button>
                </AnimatedSection>
            </div>
        </div>
    );
};

export default SettingsSection;
