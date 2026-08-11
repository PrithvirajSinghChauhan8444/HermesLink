import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useQueues } from '../../hooks/useQueues';
import QueueCard from '../queues/QueueCard';
import CreateQueueModal from '../queues/CreateQueueModal';
import EditQueueModal from '../queues/EditQueueModal';
import './QueueSection.css';

export default function QueueSection() {
    const { queues, loading, createQueue, updateQueue, deleteQueue } = useQueues();
    const containerRef = useRef(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
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

    const handleCreate = async (newQueueData, resetCallback) => {
        setActionError(null);
        const queueId = newQueueData.queue_id.trim().toLowerCase().replace(/\s+/g, '_');
        if (!queueId) return;
        if (queues.some(q => q.queue_id === queueId)) {
            setActionError(`Queue "${queueId}" already exists.`);
            return;
        }
        try {
            await createQueue(queueId, newQueueData);
            setShowCreateModal(false);
            resetCallback();
        } catch (err) {
            setActionError(err.message);
        }
    };

    const handleUpdate = async (updatedQueueData) => {
        setActionError(null);
        try {
            const { queue_id, ...fields } = updatedQueueData;
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

    return (
        <div className="queue-container">
            <h2 className="queue-title">Queue Management</h2>

            {actionError && (
                <div className="queue-error">{actionError}</div>
            )}

            <button 
                className="queue-create-btn" 
                onClick={() => { setShowCreateModal(true); setActionError(null); }}
            >
                + New Queue
            </button>

            <div ref={containerRef} className="queue-grid">
                {loading ? (
                    <div className="queue-loading">Loading queues...</div>
                ) : queues.length === 0 ? (
                    <div className="queue-loading">No queues found. Create one to get started.</div>
                ) : queues.map((queue) => (
                    <QueueCard 
                        key={queue.queue_id}
                        queue={queue}
                        onEdit={setEditingQueue}
                        onDelete={handleDelete}
                        onToggleEnabled={handleToggleEnabled}
                    />
                ))}
            </div>

            <CreateQueueModal 
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreate}
                actionError={actionError}
            />

            {editingQueue && (
                <EditQueueModal 
                    queue={editingQueue}
                    onClose={() => setEditingQueue(null)}
                    onSave={handleUpdate}
                    actionError={actionError}
                />
            )}
        </div>
    );
}
