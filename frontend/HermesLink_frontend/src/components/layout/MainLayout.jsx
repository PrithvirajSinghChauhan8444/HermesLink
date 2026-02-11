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
        <div ref={containerRef} className="relative min-h-screen h-screen overflow-y-scroll snap-y-mandatory no-scrollbar scroll-smooth">
            <div id="global-bg" className="fixed inset-0 -z-20 bg-gray-50" />

            <div className="fixed inset-0 -z-10 opacity-60">
                <Squares
                    speed={0.2}
                    squareSize={50}
                    direction="diagonal"
                    borderColor="#79787820"
                    hoverFillColor="#000000ff"
                />
            </div>

            <RightNavbar activeSection={activeSection} onNavigate={handleNavigate} />

            <main>
                {sections.map(({ id, Component }) => (
                    <section key={id} id={id} className="min-h-screen w-full relative snap-start">
                        <Component />
                    </section>
                ))}
            </main>
        </div>
    );
}
