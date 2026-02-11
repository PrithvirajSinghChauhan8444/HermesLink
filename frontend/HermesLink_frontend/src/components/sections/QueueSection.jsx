import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { endpoints } from '../../services/api';

export default function QueueSection() {
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchQueues = async () => {
            try {
                const response = await endpoints.queues.list();
                setQueues(response.data.queues);
            } catch (error) {
                console.error("Error fetching queues:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQueues();
    }, []);

    useEffect(() => {
        if (!loading && containerRef.current && queues.length > 0) {
            gsap.fromTo(containerRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power2.out", overwrite: "auto" }
            );
        }
    }, [loading]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-8 text-black">
            <h2 className="text-5xl font-light mb-12 tracking-tighter">Queue Management</h2>

            <div ref={containerRef} className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center font-light text-gray-400">Loading queues...</div>
                ) : queues.map((queue) => (
                    <div key={queue.queue_id} className="bg-white/95 p-6 rounded-xl border border-white/60 depth-shadow hover:shadow-gray-300/60 transition-all duration-300 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50 text-6xl font-black text-gray-100 -z-0 select-none group-hover:scale-110 transition-transform duration-500">
                            {queue.priority}
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-medium capitalize">{queue.queue_id}</h3>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${queue.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {queue.enabled ? 'Active' : 'Paused'}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Capacity</span>
                                        <span>{queue.max_parallel_jobs} Parallel</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-black h-full w-1/3 rounded-full opacity-20 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Threads</span>
                                        <span>{queue.max_threads_per_job} / Job</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-gray-400 h-full w-1/2 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
