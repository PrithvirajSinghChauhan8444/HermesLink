import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for scroll-based section navigation
 * Uses Intersection Observer to track which section is currently visible
 * and provides smooth scrolling to sections
 */
export const useScrollNavigation = (sectionIds = []) => {
    const [activeSection, setActiveSection] = useState(sectionIds[0] || "landing");
    const sectionRefs = useRef({});
    const scrollContainerRef = useRef(null);

    // Initialize refs for each section
    useEffect(() => {
        sectionIds.forEach((id) => {
            if (!sectionRefs.current[id]) {
                sectionRefs.current[id] = null;
            }
        });
    }, [sectionIds]);

    // Set up Intersection Observer to track visible sections
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const observerOptions = {
            root: container,
            rootMargin: "-20% 0px -60% 0px", // Trigger when section is roughly centered
            threshold: 0,
        };

        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // Observe all section elements
        Object.values(sectionRefs.current).forEach((ref) => {
            if (ref) {
                observer.observe(ref);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [sectionIds]);

    // Smooth scroll to a specific section
    const scrollToSection = useCallback((sectionId) => {
        const sectionElement = sectionRefs.current[sectionId];
        if (sectionElement) {
            sectionElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, []);

    // Helper to set a ref for a section
    const setSectionRef = useCallback((sectionId) => (element) => {
        sectionRefs.current[sectionId] = element;
    }, []);

    return {
        activeSection,
        scrollToSection,
        scrollContainerRef,
        setSectionRef,
        sectionRefs,
    };
};

export default useScrollNavigation;
