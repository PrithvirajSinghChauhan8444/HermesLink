import { useState, useRef } from 'react';
import { ref, set } from 'firebase/database';
import { rtdb } from '../../config/firebase';
import { useJobs } from '../../hooks/useJobs';
import { useDevices } from '../../hooks/useDevices';
import { formatBytes } from '../../utils/format';
import './HistorySection.css';

export default function HistorySection() {
    const { jobs, loading } = useJobs({ states: ['COMPLETED', 'FAILED', 'STOPPED'] });
    const { devices } = useDevices();
    const deviceMap = Object.fromEntries(devices.map(d => [d.device_id, d]));
    const [actionLoading, setActionLoading] = useState({});

    const handleAction = async (jobId, action) => {
        setActionLoading(prev => ({ ...prev, [jobId]: action }));
        try {
            const actionRef = ref(rtdb, `jobs/${jobId}/action`);
            await set(actionRef, action);
        } catch (error) {
            console.error(`Error sending ${action} for job ${jobId}:`, error);
        } finally {
            setActionLoading(prev => ({ ...prev, [jobId]: null }));
        }
    };

    return (
        <div className="history-container">


            <div className="history-wrapper">
                <div className="history-header">
                    <h2 className="history-title">Event Log</h2>
                    <div className="history-filters">
                        <span className="filter-pill-all">All</span>
                        <span className="filter-pill-completed">Completed</span>
                        <span className="filter-pill-failed">Failed</span>
                    </div>
                </div>

                <div className="history-table-container">
                    <div className="history-table-header">
                        <div className="col-date">Date</div>
                        <div className="col-filename">Filename / ID</div>
                        <div className="col-device">Device</div>
                        <div className="col-size">Size</div>
                        <div className="col-status">Status</div>
                        <div className="col-engine">Engine</div>
                        <div className="col-actions">Actions</div>
                    </div>

                    <div className="history-list-container">
                        {loading ? (
                            <div className="history-loading">Loading records...</div>
                        ) : jobs.length === 0 ? (
                            <div className="history-empty">No history data available.</div>
                        ) : (
                            jobs.map((job) => {
                                const jobKey = job.job_id || job.id;
                                const device = deviceMap[job.device_id];
                                return (
                                    <div key={jobKey} className="history-row group">
                                        <div className="row-date">
                                            {new Date(job.updated_at).toLocaleDateString()}
                                        </div>
                                        <div className="row-filename" title={job.engine_config?.url}>
                                            {job.progress?.filename
                                                || job.engine_config?.url?.split('/').filter(Boolean).pop()
                                                || jobKey}
                                        </div>
                                        <div className="row-device" title={job.device_id}>
                                            {device ? device.name : (job.device_id || 'Local')}
                                        </div>
                                        <div className="row-size">
                                            {formatBytes(job.progress?.total_length)}
                                        </div>
                                        <div className="row-status">
                                            <span className={`status-badge ${job.state === 'COMPLETED' ? 'status-completed' :
                                                job.state === 'FAILED' ? 'status-failed' : 'status-default'
                                                }`}>
                                                {job.state}
                                            </span>
                                        </div>
                                        <div className="row-engine">
                                            {job.engine_config?.type}
                                        </div>
                                        <div className="row-actions">
                                            {(job.state === 'FAILED' || job.state === 'STOPPED') && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="action-btn retry-btn"
                                                        disabled={!!actionLoading[jobKey]}
                                                        onClick={() => handleAction(jobKey, 'RETRY')}
                                                        title="Retry from where it left off"
                                                        style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                                                    >
                                                        {actionLoading[jobKey] === 'RETRY' ? '...' : 'Retry'}
                                                    </button>
                                                    <button
                                                        className="action-btn restart-btn"
                                                        disabled={!!actionLoading[jobKey]}
                                                        onClick={() => handleAction(jobKey, 'RESTART')}
                                                        title="Restart from scratch"
                                                        style={{ background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(250, 204, 21, 0.2)' }}
                                                    >
                                                        {actionLoading[jobKey] === 'RESTART' ? '...' : 'Restart'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
