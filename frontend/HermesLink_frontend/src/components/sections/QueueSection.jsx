import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useQueues } from '../../hooks/useQueues';
import './QueueSection.css';

export default function QueueSection() {
    const { queues, loading, createQueue, updateQueue, deleteQueue } = useQueues();
    const containerRef = useRef(null);

    // Create Queue modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newQueue, setNewQueue] = useState({
        queue_id: '', name: '', max_parallel_jobs: 2,
        max_threads_per_job: 4, priority: 10,
    });

    // Edit Queue modal state
    const [editingQueue, setEditingQueue] = useState(null);

    const [actionError, setActionError] = useState(null);

    useEffect(() => {
        if (!loading && containerRef.current && queues.length > 0) {
            gsap.fromTo(containerRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power2.out", overwrite: "auto" }
            );
        }
    }, [loading, queues.length]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setActionError(null);
        const queueId = newQueue.queue_id.trim().toLowerCase().replace(/\s+/g, '_');
        if (!queueId) return;
        if (queues.some(q => q.queue_id === queueId)) {
            setActionError(`Queue "${queueId}" already exists.`);
            return;
        }
        try {
            await createQueue(queueId, newQueue);
            setShowCreateModal(false);
            setNewQueue({ queue_id: '', name: '', max_parallel_jobs: 2, max_threads_per_job: 4, priority: 10 });
        } catch (err) {
            setActionError(err.message);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setActionError(null);
        try {
            const { queue_id, ...fields } = editingQueue;
            await updateQueue(queue_id, fields);
            setEditingQueue(null);
        } catch (err) {
            setActionError(err.message);
        }
    };

    const handleDelete = async (queueId) => {
        if (queueId === 'default') return;
        if (!window.confirm(`Delete queue "${queueId}"? Jobs using it will fall back to default.`)) return;
        try {
            await deleteQueue(queueId);
        } catch (err) {
            setActionError(err.message);
        }
    };

    const handleToggleEnabled = async (queue) => {
        try {
            await updateQueue(queue.queue_id, { enabled: !queue.enabled });
        } catch (err) {
            setActionError(err.message);
        }
    };

    // ─── Render ──────────────────────────────────────────────
    return (
        <div className="queue-container">
            <h2 className="queue-title">Queue Management</h2>

            {actionError && (
                <div className="queue-error">{actionError}</div>
            )}

            <button className="queue-create-btn" onClick={() => { setShowCreateModal(true); setActionError(null); }}>
                + New Queue
            </button>

            <div ref={containerRef} className="queue-grid">
                {loading ? (
                    <div className="queue-loading">Loading queues...</div>
                ) : queues.length === 0 ? (
                    <div className="queue-loading">No queues found. Create one to get started.</div>
                ) : queues.map((queue) => (
                    <div key={queue.queue_id} className="queue-card group">
                        <div className="queue-priority-bg">
                            {queue.priority}
                        </div>

                        <div className="queue-content">
                            <div className="queue-header">
                                <h3 className="queue-id">{queue.name || queue.queue_id}</h3>
                                <div
                                    className={`queue-status-badge cursor-pointer ${queue.enabled ? 'status-active' : 'status-paused'}`}
                                    onClick={() => handleToggleEnabled(queue)}
                                    title="Click to toggle"
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
                                <button className="queue-edit-btn" onClick={() => { setEditingQueue({ ...queue }); setActionError(null); }}>
                                    Edit
                                </button>
                                {queue.queue_id !== 'default' && (
                                    <button className="queue-delete-btn" onClick={() => handleDelete(queue.queue_id)}>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Create Modal ────────────────────────────────── */}
            {showCreateModal && (
                <div className="queue-modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="queue-modal" onClick={e => e.stopPropagation()}>
                        <h3>Create Queue</h3>
                        <form onSubmit={handleCreate}>
                            <label>Queue ID
                                <input type="text" value={newQueue.queue_id} onChange={e => setNewQueue({ ...newQueue, queue_id: e.target.value })} required placeholder="e.g. movies" />
                            </label>
                            <label>Name
                                <input type="text" value={newQueue.name} onChange={e => setNewQueue({ ...newQueue, name: e.target.value })} placeholder="e.g. Movies Queue" />
                            </label>
                            <label>Max Parallel Jobs
                                <input type="number" min="1" value={newQueue.max_parallel_jobs} onChange={e => setNewQueue({ ...newQueue, max_parallel_jobs: Number(e.target.value) })} />
                            </label>
                            <label>Max Threads / Job
                                <input type="number" min="1" value={newQueue.max_threads_per_job} onChange={e => setNewQueue({ ...newQueue, max_threads_per_job: Number(e.target.value) })} />
                            </label>
                            <label>Priority
                                <input type="number" min="0" value={newQueue.priority} onChange={e => setNewQueue({ ...newQueue, priority: Number(e.target.value) })} />
                            </label>
                            <div className="queue-modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Edit Modal ─────────────────────────────────── */}
            {editingQueue && (
                <div className="queue-modal-overlay" onClick={() => setEditingQueue(null)}>
                    <div className="queue-modal" onClick={e => e.stopPropagation()}>
                        <h3>Edit: {editingQueue.queue_id}</h3>
                        <form onSubmit={handleUpdate}>
                            <label>Name
                                <input type="text" value={editingQueue.name || ''} onChange={e => setEditingQueue({ ...editingQueue, name: e.target.value })} />
                            </label>
                            <label>Max Parallel Jobs
                                <input type="number" min="1" value={editingQueue.max_parallel_jobs} onChange={e => setEditingQueue({ ...editingQueue, max_parallel_jobs: Number(e.target.value) })} />
                            </label>
                            <label>Max Threads / Job
                                <input type="number" min="1" value={editingQueue.max_threads_per_job} onChange={e => setEditingQueue({ ...editingQueue, max_threads_per_job: Number(e.target.value) })} />
                            </label>
                            <label>Priority
                                <input type="number" min="0" value={editingQueue.priority} onChange={e => setEditingQueue({ ...editingQueue, priority: Number(e.target.value) })} />
                            </label>
                            <div className="queue-modal-actions">
                                <button type="button" onClick={() => setEditingQueue(null)}>Cancel</button>
                                <button type="submit">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
