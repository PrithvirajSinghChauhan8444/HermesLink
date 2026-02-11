import { useState, useEffect } from 'react';
import { endpoints } from '../../services/api';
import './NewJobModal.css';

export default function NewJobModal({ isOpen, onClose, onJobCreated }) {
    const [url, setUrl] = useState('');
    const [type, setType] = useState('aria2');
    const [queueId, setQueueId] = useState('default');
    const [destination, setDestination] = useState('');
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchQueues();
            // Reset form
            setUrl('');
            setType('aria2');
            setQueueId('default');
            setDestination('');
            setError(null);
        }
    }, [isOpen]);

    const fetchQueues = async () => {
        try {
            const response = await endpoints.queues.list();
            setQueues(response.data.queues);
        } catch (err) {
            console.error("Error fetching queues:", err);
            // Fallback to default if fetch fails
            setQueues([{ queue_id: 'default', priority: 10 }]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await endpoints.jobs.create({
                url,
                type,
                queue_id: queueId,
                destination: destination || undefined
            });
            onJobCreated();
            onClose();
        } catch (err) {
            console.error("Error creating job:", err);
            setError(err.response?.data?.detail || "Failed to create job");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="new-job-modal-overlay">
            <div className="new-job-modal-container">
                <div className="modal-header">
                    <h2 className="modal-title">New Download</h2>
                    <button onClick={onClose} className="close-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label className="form-label">URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/file.zip"
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="form-select"
                            >
                                <option value="direct">Direct (HTTP/HTTPS)</option>
                                <option value="media">Media (YouTube/Twitch)</option>
                                <option value="p2p">P2P (Torrent/Magnet)</option>
                                <option value="aria2">Aria2 (External)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Queue</label>
                            <select
                                value={queueId}
                                onChange={(e) => setQueueId(e.target.value)}
                                className="form-select"
                            >
                                {queues.map(q => (
                                    <option key={q.queue_id} value={q.queue_id}>
                                        {q.queue_id} (P: {q.priority})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Destination Folder (Optional)</label>
                        <input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="/home/user/downloads"
                            className="form-input"
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="submit-button">
                            {loading ? 'Creating...' : 'Start Download'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
