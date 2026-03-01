import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

import RightNavbar from './RightNavbar';
import LandingSection from '../sections/LandingSection';
import ActiveJobsSection from '../sections/ActiveJobsSection';
import QueueSection from '../sections/QueueSection';
import HistorySection from '../sections/HistorySection';
import SettingsSection from '../sections/SettingsSection';
import Squares from '../animated_components/Minimal_background/Squares';

import './MainLayout.css';

gsap.registerPlugin(ScrollToPlugin);

export default function MainLayout() {
    const [activeSection, setActiveSection] = useState('landing');
    const containerRef = useRef(null);

    // Define sections configuration to map IDs to components and indices
    const sections = [
        { id: 'landing', Component: LandingSection },
        { id: 'active-jobs', Component: ActiveJobsSection },
        { id: 'queue', Component: QueueSection },
        { id: 'history', Component: HistorySection },
        { id: 'settings', Component: SettingsSection },
    ];

    // Use IntersectionObserver for scroll spy behavior - robust with CSS snapping
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            {
                root: containerRef.current, // Use the scroll container as root
                threshold: 0.5, // Trigger when 50% of the section is visible
            }
        );

        sections.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    const isScrolling = useRef(false);

    // Intercept mouse wheel and use GSAP for smooth section-to-section scrolling
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault();
            if (isScrolling.current) return;

            const currentIndex = sections.findIndex(s => s.id === activeSection);
            const nextIndex = e.deltaY > 0
                ? Math.min(currentIndex + 1, sections.length - 1)
                : Math.max(currentIndex - 1, 0);

            if (nextIndex === currentIndex) return;

            isScrolling.current = true;
            gsap.to(container, {
                duration: 1,
                scrollTo: { y: `#${sections[nextIndex].id}`, autoKill: false },
                ease: 'power2.inOut',
                onComplete: () => {
                    isScrolling.current = false;
                }
            });
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [activeSection]);

    const handleNavigate = (id) => {
        gsap.to(containerRef.current, {
            duration: 1,
            scrollTo: { y: `#${id}`, autoKill: false },
            ease: "power2.inOut"
        });
    };

    // Background color transition logic
    useEffect(() => {
        const bg = document.getElementById('global-bg');
        if (!bg) return;

        // Dark sections
        if (activeSection === 'history' || activeSection === 'settings') {
            gsap.to(bg, {
                backgroundColor: '#000000',
                duration: 0.8,
                ease: 'power2.inOut'
            });
        }
        // Light sections
        else {
            gsap.to(bg, {
                backgroundColor: '#FAFAFA', // gray-50
                duration: 0.8,
                ease: 'power2.inOut'
            });
        }
    }, [activeSection]);

    return (
        <div ref={containerRef} className="main-layout-container">
            <div id="global-bg" className="global-bg" />

            <div className="squares-container">
                <Squares
                    speed={0.01}
                    squareSize={50}
                    direction="diagonal"
                    borderColor="#79787820"
                    hoverFillColor="#000000ff"
                />
            </div>

            <RightNavbar activeSection={activeSection} onNavigate={handleNavigate} />

            <main>
                {sections.map(({ id, Component }) => (
                    <section key={id} id={id} className="section-container">
                        <Component />
                    </section>
                ))}
            </main>
        </div>
    );
}
