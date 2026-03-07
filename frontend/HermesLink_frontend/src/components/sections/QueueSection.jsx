import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { endpoints } from '../../services/api';



import './QueueSection.css';

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
        <div className="queue-container">


            <h2 className="queue-title">Queue Management</h2>

            <div ref={containerRef} className="queue-grid">
                {loading ? (
                    <div className="queue-loading">Loading queues...</div>
                ) : queues.map((queue) => (
                    <div key={queue.queue_id} className="queue-card group">
                        <div className="queue-priority-bg">
                            {queue.priority}
                        </div>

                        <div className="queue-content">
                            <div className="queue-header">
                                <h3 className="queue-id">{queue.queue_id}</h3>
                                <div className={`queue-status-badge ${queue.enabled ? 'status-active' : 'status-paused'
                                    }`}>
                                    {queue.enabled ? 'Active' : 'Paused'}
                                </div>
                            </div>

                            <div className="queue-stats-container">
                                <div>
                                    <div className="queue-stat-row">
                                        <span>Capacity</span>
                                        <span>{queue.max_parallel_jobs} Parallel</span>
                                    </div>
                                    <div className="progress-bg">
                                        <div className="progress-fill-black" />
                                    </div>
                                </div>
                                <div>
                                    <div className="queue-stat-row">
                                        <span>Threads</span>
                                        <span>{queue.max_threads_per_job} / Job</span>
                                    </div>
                                    <div className="progress-bg">
                                        <div className="progress-fill-gray" />
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
