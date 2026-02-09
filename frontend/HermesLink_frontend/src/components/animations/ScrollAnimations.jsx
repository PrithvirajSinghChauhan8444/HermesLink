import React from "react";
import { motion } from "motion/react";

/**
 * Animated section wrapper for scroll-based animations
 * Provides fade-in and slide-up effects when section enters viewport
 */
export const AnimatedSection = ({
    children,
    className = "",
    delay = 0,
    direction = "up", // up, down, left, right
    distance = 60,
}) => {
    const directions = {
        up: { y: distance, x: 0 },
        down: { y: -distance, x: 0 },
        left: { x: distance, y: 0 },
        right: { x: -distance, y: 0 },
    };

    const initial = {
        opacity: 0,
        ...directions[direction],
    };

    return (
        <motion.div
            className={className}
            initial={initial}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
                duration: 0.8,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
        >
            {children}
        </motion.div>
    );
};

/**
 * Staggered children animation wrapper
 */
export const StaggerContainer = ({
    children,
    className = "",
    staggerDelay = 0.1,
    delayChildren = 0.2,
}) => {
    return (
        <motion.div
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        delayChildren,
                        staggerChildren: staggerDelay,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
};

/**
 * Stagger item - use as child of StaggerContainer
 */
export const StaggerItem = ({
    children,
    className = "",
    direction = "up",
}) => {
    const directions = {
        up: { y: 30 },
        down: { y: -30 },
        left: { x: 30 },
        right: { x: -30 },
    };

    return (
        <motion.div
            className={className}
            variants={{
                hidden: { opacity: 0, ...directions[direction] },
                visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: {
                        duration: 0.6,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
};

/**
 * Scale-in animation on scroll
 */
export const ScaleIn = ({
    children,
    className = "",
    delay = 0,
    scale = 0.8,
}) => {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, scale }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
                duration: 0.6,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
        >
            {children}
        </motion.div>
    );
};

/**
 * Blur-in animation
 */
export const BlurIn = ({
    children,
    className = "",
    delay = 0,
}) => {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, filter: "blur(20px)" }}
            whileInView={{ opacity: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
                duration: 0.8,
                delay,
                ease: "easeOut",
            }}
        >
            {children}
        </motion.div>
    );
};

/**
 * Floating animation (continuous)
 */
export const FloatingElement = ({
    children,
    className = "",
    duration = 4,
    distance = 15,
}) => {
    return (
        <motion.div
            className={className}
            animate={{
                y: [-distance, distance, -distance],
            }}
            transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            {children}
        </motion.div>
    );
};

/**
 * Glow pulse animation
 */
export const GlowPulse = ({
    children,
    className = "",
    color = "var(--color-accent-primary)",
}) => {
    return (
        <motion.div
            className={className}
            animate={{
                boxShadow: [
                    `0 0 20px ${color}40`,
                    `0 0 40px ${color}60`,
                    `0 0 20px ${color}40`,
                ],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            {children}
        </motion.div>
    );
};

/**
 * Text reveal animation (word by word)
 */
export const TextReveal = ({
    text,
    className = "",
    delay = 0,
}) => {
    const words = text.split(" ");

    return (
        <motion.span
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: 0.05,
                        delayChildren: delay,
                    },
                },
            }}
        >
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    style={{ display: "inline-block", marginRight: "0.25em" }}
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.4, ease: "easeOut" },
                        },
                    }}
                >
                    {word}
                </motion.span>
            ))}
        </motion.span>
    );
};

/**
 * Counter animation
 */
export const AnimatedCounter = ({
    value,
    className = "",
    duration = 2,
}) => {
    return (
        <motion.span
            className={className}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
        >
            <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
            >
                {value}
            </motion.span>
        </motion.span>
    );
};

export default {
    AnimatedSection,
    StaggerContainer,
    StaggerItem,
    ScaleIn,
    BlurIn,
    FloatingElement,
    GlowPulse,
    TextReveal,
    AnimatedCounter,
};
