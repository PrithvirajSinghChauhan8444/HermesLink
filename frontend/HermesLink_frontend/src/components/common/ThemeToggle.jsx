import React from "react";
import { motion } from "motion/react";
import { useTheme } from "../../hooks/ThemeContext";
import "./ThemeToggle.css";

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <motion.button
            className="theme-toggle"
            onClick={toggleTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
            <motion.div
                className="toggle-icon-container"
                initial={false}
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
            >
                {/* Sun Icon */}
                <motion.svg
                    className="toggle-icon sun-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={false}
                    animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0.5 : 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </motion.svg>

                {/* Moon Icon */}
                <motion.svg
                    className="toggle-icon moon-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={false}
                    animate={{ opacity: isDark ? 1 : 0, scale: isDark ? 1 : 0.5 }}
                    transition={{ duration: 0.3 }}
                >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </motion.svg>
            </motion.div>
        </motion.button>
    );
};

export default ThemeToggle;
