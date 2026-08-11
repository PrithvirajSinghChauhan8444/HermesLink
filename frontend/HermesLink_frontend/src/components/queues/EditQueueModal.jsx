import { useState } from 'react';

export default function EditQueueModal({ queue, onClose, onSave, actionError }) {
    const [editingQueue, setEditingQueue] = useState({ ...queue });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(editingQueue);
    };

    return (
        <div className="queue-modal-overlay" onClick={onClose}>
            <div className="queue-modal" onClick={e => e.stopPropagation()}>
                <h3>Edit: {queue.queue_id}</h3>
                {actionError && <div className="queue-error">{actionError}</div>}
                <form onSubmit={handleSubmit}>
                    <label>Name
                        <input 
                            type="text" 
                            value={editingQueue.name || ''} 
                            onChange={e => setEditingQueue({ ...editingQueue, name: e.target.value })} 
                        />
                    </label>
                    <label>Max Parallel Jobs
                        <input 
                            type="number" 
                            min="1" 
                            value={editingQueue.max_parallel_jobs} 
                            onChange={e => setEditingQueue({ ...editingQueue, max_parallel_jobs: Number(e.target.value) })} 
                        />
                    </label>
                    <label>Max Threads / Job
                        <input 
                            type="number" 
                            min="1" 
                            value={editingQueue.max_threads_per_job} 
                            onChange={e => setEditingQueue({ ...editingQueue, max_threads_per_job: Number(e.target.value) })} 
                        />
                    </label>
                    <label>Priority
                        <input 
                            type="number" 
                            min="0" 
                            value={editingQueue.priority} 
                            onChange={e => setEditingQueue({ ...editingQueue, priority: Number(e.target.value) })} 
                        />
                    </label>
                    <div className="queue-modal-actions">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
