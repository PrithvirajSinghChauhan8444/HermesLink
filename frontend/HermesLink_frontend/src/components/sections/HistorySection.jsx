import { useState, useEffect, useRef } from 'react';
import { endpoints } from '../../services/api';
import { formatBytes } from '../../utils/format';

import './HistorySection.css';

export default function HistorySection() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await endpoints.jobs.history();
                setJobs(response.data.jobs);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

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
                        <div className="col-size">Size</div>
                        <div className="col-status">Status</div>
                        <div className="col-engine">Engine</div>
                    </div>

                    <div className="history-list-container">
                        {loading ? (
                            <div className="history-loading">Loading records...</div>
                        ) : jobs.length === 0 ? (
                            <div className="history-empty">No history data available.</div>
                        ) : (
                            jobs.map((job) => (
                                <div key={job.job_id} className="history-row group">
                                    <div className="row-date">
                                        {new Date(job.updated_at).toLocaleDateString()}
                                    </div>
                                    <div className="row-filename" title={job.engine_config.url}>
                                        {job.progress.filename
                                            || job.engine_config.url?.split('/').filter(Boolean).pop()
                                            || job.job_id}
                                    </div>
                                    <div className="row-size">
                                        {formatBytes(job.progress.total_length)}
                                    </div>
                                    <div className="row-status">
                                        <span className={`status-badge ${job.state === 'COMPLETED' ? 'status-completed' :
                                            job.state === 'FAILED' ? 'status-failed' : 'status-default'
                                            }`}>
                                            {job.state}
                                        </span>
                                    </div>
                                    <div className="row-engine">
                                        {job.engine_config.type}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
