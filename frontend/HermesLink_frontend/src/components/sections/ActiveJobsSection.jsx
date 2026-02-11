import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { endpoints } from '../../services/api';
import { formatBytes } from '../../utils/format';

export default function ActiveJobsSection() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalSpeed, setTotalSpeed] = useState("0 B/s");
    const containerRef = useRef(null);

    const fetchJobs = async () => {
        try {
            const response = await endpoints.jobs.active();
            setJobs(response.data.jobs);

            // Calculate total speed if possible (mock for now as backend sends formatted strings)
            // Ideally backend sends raw bytes, but we'll just show active count
            setLoading(false);
        } catch (error) {
            console.error("Error fetching active jobs:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading && containerRef.current && jobs.length > 0) {
            gsap.fromTo(containerRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "power2.out", overwrite: "auto" }
            );
        }
    }, [loading]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-8 text-black">
            <div className="w-full max-w-5xl flex justify-between items-end mb-12 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-5xl font-light tracking-tighter text-black">Active Operations</h2>
                    <p className="text-gray-400 mt-2 font-light">Real-time download monitoring</p>
                </div>
                <div className="text-right hidden md:block">
                    <span className="text-4xl font-light block">{jobs.length}</span>
                    <span className="text-xs uppercase tracking-wider text-gray-400">Running Tasks</span>
                </div>
            </div>

            <div ref={containerRef} className="w-full max-w-5xl space-y-4 h-[60vh] overflow-y-auto no-scrollbar pr-2">
                {loading ? (
                    <div className="text-center font-light animate-pulse text-gray-400">Syncing...</div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                        <span className="text-2xl font-light mb-2">System Idle</span>
                        <span className="text-sm">No active downloads</span>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <div key={job.job_id} className="bg-white/95 p-6 rounded-xl border border-white/60 depth-shadow hover:shadow-gray-300/60 transition-all duration-300 group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${job.state === 'RUNNING' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                    <h3 className="text-lg font-medium truncate max-w-[400px] text-gray-800">{job.progress.filename || job.job_id}</h3>
                                </div>
                                <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                    {job.engine_config.type}
                                </span>
                            </div>

                            <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden relative z-10">
                                <div
                                    className="bg-black h-full rounded-full transition-all duration-500 ease-out relative"
                                    style={{ width: `${job.progress.percent || 0}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-[50px] bg-gradient-to-l from-white/30 to-transparent" />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-500 font-mono relative z-10">
                                <div className="flex gap-4">
                                    <span className="bg-gray-50 px-2 py-1 rounded">{formatBytes(job.progress.completed_length)} / {formatBytes(job.progress.total_length)}</span>
                                    <span className="bg-gray-50 px-2 py-1 rounded">{job.progress.speed || "0 B/s"}</span>
                                </div>
                                <span className="text-gray-400">ETA: <span className="text-black font-semibold">{job.progress.eta || "--:--:--"}</span></span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
