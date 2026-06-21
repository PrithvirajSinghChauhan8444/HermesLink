import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJobs } from '../../hooks/useJobs';
import { useQueues } from '../../hooks/useQueues';

import './LandingSection.css';

export default function LandingSection() {
    const comp = useRef(null);
    const { jobs: activeJobs } = useJobs({ states: ['PENDING', 'RUNNING', 'PAUSED'] });
    const { jobs: historyJobs } = useJobs({ states: ['COMPLETED', 'FAILED', 'STOPPED'] });
    const { queues } = useQueues();

    useLayoutEffect(() => {
        let ctx = gsap.context(() => {
            const tl = gsap.timeline();

            tl.from("#hero-title", {
                y: 50,
                opacity: 0,
                duration: 1,
                ease: "power3.out"
            })
                .from(".stat-card", {
                    y: 20,
                    opacity: 0,
                    stagger: 0.1,
                    duration: 0.8,
                    ease: "power2.out"
                }, "-=0.5");

        }, comp);
        return () => ctx.revert();
    }, []);

    return (
        <div ref={comp} className="landing-section-container">
            {/* Background Decor */}
            <div className="bg-decor-container">
                <div className="orb-1" />
                <div className="orb-2" />

            </div>

            <div className="content-container">
                <div id="hero-title" className="hero-title">
                    <h1 className="hero-h1">
                        HermesLink
                    </h1>
                    <p className="hero-subtitle">
                        Advanced Download Manager
                    </p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-value">{activeJobs?.length ?? 0}</span>
                        <span className="stat-label">Active Jobs</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{queues?.length ?? 0}</span>
                        <span className="stat-label">Queues</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{historyJobs?.length ?? 0}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                </div>
            </div>

            <div className="scroll-indicator">
                <svg
                    width="50"
                    height="50"
                    viewBox="0 0 50 50"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                </svg>
            </div>
        </div>
    );
}
