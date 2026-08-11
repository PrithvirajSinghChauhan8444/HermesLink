import { useState } from 'react';

export default function CreateQueueModal({ isOpen, onClose, onCreate, actionError }) {
    const [newQueue, setNewQueue] = useState({
        queue_id: '',
        name: '',
        max_parallel_jobs: 2,
        max_threads_per_job: 4,
        priority: 10,
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(newQueue, () => {
            // Reset state upon successful creation
            setNewQueue({
                queue_id: '',
                name: '',
                max_parallel_jobs: 2,
                max_threads_per_job: 4,
                priority: 10,
            });
        });
    };

    return (
        <div className="queue-modal-overlay" onClick={onClose}>
            <div className="queue-modal" onClick={e => e.stopPropagation()}>
                <h3>Create Queue</h3>
                {actionError && <div className="queue-error">{actionError}</div>}
                <form onSubmit={handleSubmit}>
                    <label>Queue ID
                        <input 
                            type="text" 
                            value={newQueue.queue_id} 
                            onChange={e => setNewQueue({ ...newQueue, queue_id: e.target.value })} 
                            required 
                            placeholder="e.g. movies" 
                        />
                    </label>
                    <label>Name
                        <input 
                            type="text" 
                            value={newQueue.name} 
                            onChange={e => setNewQueue({ ...newQueue, name: e.target.value })} 
                            placeholder="e.g. Movies Queue" 
                        />
                    </label>
                    <label>Max Parallel Jobs
                        <input 
                            type="number" 
                            min="1" 
                            value={newQueue.max_parallel_jobs} 
                            onChange={e => setNewQueue({ ...newQueue, max_parallel_jobs: Number(e.target.value) })} 
                        />
                    </label>
                    <label>Max Threads / Job
                        <input 
                            type="number" 
                            min="1" 
                            value={newQueue.max_threads_per_job} 
                            onChange={e => setNewQueue({ ...newQueue, max_threads_per_job: Number(e.target.value) })} 
                        />
                    </label>
                    <label>Priority
                        <input 
                            type="number" 
                            min="0" 
                            value={newQueue.priority} 
                            onChange={e => setNewQueue({ ...newQueue, priority: Number(e.target.value) })} 
                        />
                    </label>
                    <div className="queue-modal-actions">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
