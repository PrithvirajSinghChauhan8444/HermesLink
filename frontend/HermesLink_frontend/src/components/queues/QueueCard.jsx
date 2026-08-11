export default function QueueCard({ queue, onEdit, onDelete, onToggleEnabled, activeCount = 0 }) {
    return (
        <div className="queue-card group">
            <div className="queue-priority-bg">
                {queue.priority}
            </div>

            <div className="queue-content">
                <div className="queue-header">
                    <h3 className="queue-id">{queue.name || queue.queue_id}</h3>
                    <div
                        className={`queue-status-badge cursor-pointer ${queue.enabled ? 'status-active' : 'status-paused'}`}
                        onClick={() => onToggleEnabled(queue)}
                        title="Click to toggle status"
                    >
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

                {queue.updated_on && (
                    <div className="queue-updated-on">Updated: {queue.updated_on}</div>
                )}

                <div className="queue-actions">
                    <button className="queue-edit-btn" onClick={() => onEdit(queue)}>
                        Edit
                    </button>
                    {queue.queue_id !== 'default' && (
                        <button className="queue-delete-btn" onClick={() => onDelete(queue.queue_id)}>
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
