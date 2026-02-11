import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { endpoints } from '../../services/api';

export default function LandingSection() {
    const comp = useRef(null);
    const [stats, setStats] = useState({ active: 0, queue: 0, history: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [activeRes, queueRes, historyRes] = await Promise.all([
                    endpoints.jobs.active(),
                    endpoints.queues.list(),
                    endpoints.jobs.history()
                ]);
                setStats({
                    active: activeRes.data.total,
                    queue: queueRes.data.queues.length, // approximation or count
                    history: historyRes.data.total
                });
            } catch (e) {
                console.error("Failed to fetch dashboard stats", e);
            }
        };
        fetchStats();
    }, []);

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
        <div ref={comp} className="h-screen w-full flex flex-col items-center justify-center text-black relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-gray-300 to-transparent blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-gray-300 to-transparent blur-3xl" />
            </div>

            <div className="z-10 flex flex-col items-center gap-8">
                <div id="hero-title" className="text-center">
                    <h1 className="text-8xl md:text-9xl font-bold tracking-tighter mb-2 bg-gradient-to-b from-black to-gray-600 bg-clip-text text-transparent">
                        HermesLink
                    </h1>
                    <p className="text-xl md:text-2xl font-light tracking-widest uppercase text-gray-500">
                        Advanced Download Manager
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-8">
                    <div className="stat-card bg-white/95 p-6 rounded-xl border border-white/50 depth-shadow flex flex-col items-center hover:scale-105 transition-transform duration-300">
                        <span className="text-4xl font-light">{stats.active}</span>
                        <span className="text-xs uppercase tracking-wider text-gray-500 mt-2 font-bold">Active Jobs</span>
                    </div>
                    <div className="stat-card bg-white/95 p-6 rounded-xl border border-white/50 depth-shadow flex flex-col items-center hover:scale-105 transition-transform duration-300">
                        <span className="text-4xl font-light">{stats.queue}</span>
                        <span className="text-xs uppercase tracking-wider text-gray-500 mt-2 font-bold">Queues</span>
                    </div>
                    <div className="stat-card bg-white/95 p-6 rounded-xl border border-white/50 depth-shadow flex flex-col items-center hover:scale-105 transition-transform duration-300">
                        <span className="text-4xl font-light">{stats.history}</span>
                        <span className="text-xs uppercase tracking-wider text-gray-500 mt-2 font-bold">Completed</span>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-12 animate-bounce text-black/20">
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
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
