import { useState, useEffect, useRef } from 'react';
import { ref, set } from 'firebase/database';
import gsap from 'gsap';
import { rtdb } from '../../config/firebase';
import { useJobs } from '../../hooks/useJobs';
import { useDevices } from '../../hooks/useDevices';
import NewJobModal from '../features/NewJobModal';
import ActiveJobCard from '../jobs/ActiveJobCard';

import './ActiveJobsSection.css';

export default function ActiveJobsSection() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // { job_id: action }
    const containerRef = useRef(null);

    // Real-time Firestore listener
    const { jobs, loading } = useJobs({ states: ['PENDING', 'RUNNING', 'PAUSED'] });

    // Live device presence
    const { devices } = useDevices();
    const deviceMap = Object.fromEntries(devices.map(d => [d.device_id, d]));

    // Animate job cards on first load
    useEffect(() => {
        if (!loading && containerRef.current && jobs.length > 0) {
            gsap.fromTo(containerRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "power2.out", overwrite: "auto" }
            );
        }
    }, [loading]);

    const handleAction = async (jobId, action) => {
        setActionLoading(prev => ({ ...prev, [jobId]: action }));
        try {
            // Write control action to RTDB for the agent to pick up
            const actionRef = ref(rtdb, `jobs/${jobId}/action`);
            await set(actionRef, action);
        } catch (error) {
            console.error(`Error sending ${action} for job ${jobId}:`, error);
        } finally {
            setActionLoading(prev => ({ ...prev, [jobId]: null }));
        }
    };

    return (
        <div className="active-jobs-container">
            <div className="header-container">
                <div>
                    <h2 className="title-large">Active Operations</h2>
                    <p className="subtitle-gray">Real-time download monitoring</p>
                </div>
                <button
                    className="new-download-btn"
                    onClick={() => setIsModalOpen(true)}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Download
                </button>
                <div className="stats-container">
                    <span className="stat-number-large">{jobs.length}</span>
                    <span className="stat-label-small">Running Tasks</span>
                </div>
            </div>

            <div ref={containerRef} className="jobs-grid-container">
                {loading ? (
                    <div className="loading-text">Syncing...</div>
                ) : jobs.length === 0 ? (
                    <div className="empty-state-container">
                        <span className="empty-title">System Idle</span>
                        <span className="empty-subtitle">No active downloads</span>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <ActiveJobCard
                            key={job.job_id || job.id}
                            job={job}
                            actionLoading={actionLoading}
                            handleAction={handleAction}
                            deviceMap={deviceMap}
                        />
                    ))
                )}
            </div>

            <NewJobModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onJobCreated={() => {}} 
            />
        </div>
    );
}
