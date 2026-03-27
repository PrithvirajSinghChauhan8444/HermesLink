import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useDevices } from '../../hooks/useDevices';
import { endpoints } from '../../services/api';
import './NewJobModal.css';

export default function NewJobModal({ isOpen, onClose, onJobCreated }) {
    const [url, setUrl] = useState('');
    const [type, setType] = useState('aria2');
    const [queueId, setQueueId] = useState('default');
    const [destination, setDestination] = useState('');
    const [selectedStorageProfile, setSelectedStorageProfile] = useState('default');
    const [destinationPathIndex, setDestinationPathIndex] = useState(0);
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const { devices } = useDevices();
    const onlineDevices = devices.filter(d => d.status === 'online');

    useEffect(() => {
        if (isOpen) {
            fetchQueues();
            setUrl('');
            setType('aria2');
            setQueueId('default');
            setDestination('');
            setSelectedStorageProfile('default');
            setDestinationPathIndex(0);
            setError(null);
            setSelectedDevice(null);
        }
    }, [isOpen]);

    // Auto-select the first online device when devices load
    useEffect(() => {
        if (isOpen && onlineDevices.length > 0 && !selectedDevice) {
            setSelectedDevice(onlineDevices[0]);
        }
    }, [onlineDevices, isOpen]);

    // Update default storage profile when device changes
    useEffect(() => {
        if (selectedDevice && selectedDevice.storage_profiles) {
            const profileKeys = Object.keys(selectedDevice.storage_profiles);
            if (profileKeys.length > 0 && !profileKeys.includes(selectedStorageProfile)) {
                setSelectedStorageProfile(profileKeys[0]);
            } else if (profileKeys.length === 0) {
                setSelectedStorageProfile('default');
            }
            setDestinationPathIndex(0);
        }
    }, [selectedDevice]);

    // Get paths for the currently selected profile
    const selectedProfileData = selectedDevice?.storage_profiles?.[selectedStorageProfile];
    const profilePaths = selectedProfileData?.paths || [];
    const profileBaseNames = selectedProfileData?.base_names || profilePaths.map(p => p.split('/').filter(Boolean).pop() || p);

    const fetchQueues = async () => {
        try {
            const response = await endpoints.queues.list();
            setQueues(response.data.queues);
        } catch (err) {
            console.error("Error fetching queues:", err);
            setQueues([{ queue_id: 'default', priority: 10 }]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDevice) {
            setError('Please select a device to run the download.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // Write directly to Firestore `jobs` collection so agent listener fires instantly
            await addDoc(collection(db, 'jobs'), {
                device_id: selectedDevice.device_id,
                state: 'PENDING',
                engine_config: {
                    url,
                    type,
                    queue_id: queueId,
                    storage_profile_id: selectedStorageProfile,
                    destination_path_index: destinationPathIndex,
                    sub_directory: destination || "",
                },
                progress: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            onJobCreated?.();
            onClose();
        } catch (err) {
            console.error("Error creating job:", err);
            setError(err.message || "Failed to create job");
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
                    {/* URL */}
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

                    {/* Device Selector */}
                    <div className="form-group">
                        <label className="form-label">Device</label>
                        {onlineDevices.length === 0 ? (
                            <div className="device-selector-empty">
                                <span>⚠️ No devices online. Start the HermesLink agent on a device.</span>
                            </div>
                        ) : (
                            <select
                                value={selectedDevice?.device_id || ''}
                                onChange={(e) => {
                                    const dev = onlineDevices.find(d => d.device_id === e.target.value);
                                    setSelectedDevice(dev || null);
                                }}
                                className="form-select"
                                required
                            >
                                <option value="" disabled>Select a device...</option>
                                {onlineDevices.map(device => (
                                    <option key={device.device_id} value={device.device_id}>
                                        🟢 {device.name} ({device.platform})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Storage Profile</label>
                        {(!selectedDevice || !selectedDevice.storage_profiles || Object.keys(selectedDevice.storage_profiles).length === 0) ? (
                            <select disabled className="form-select opacity-50 cursor-not-allowed">
                                <option>Default Storage</option>
                            </select>
                        ) : (
                            <select
                                value={selectedStorageProfile}
                                onChange={(e) => {
                                    setSelectedStorageProfile(e.target.value);
                                    setDestinationPathIndex(0);
                                }}
                                className="form-select"
                                required
                            >
                                {Object.entries(selectedDevice.storage_profiles).map(([p_id, p_info]) => (
                                    <option key={p_id} value={p_id}>
                                        {p_info.name || p_id}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Destination Path — shown only if profile has multiple paths */}
                    {profilePaths.length > 1 && (
                        <div className="form-group">
                            <label className="form-label">Destination</label>
                            <select
                                value={destinationPathIndex}
                                onChange={(e) => setDestinationPathIndex(Number(e.target.value))}
                                className="form-select"
                            >
                                {profileBaseNames.map((name, idx) => (
                                    <option key={idx} value={idx}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Sub-directory (Optional)</label>
                        <input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="e.g. Inception (2010)"
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
                        <button
                            type="submit"
                            disabled={loading || onlineDevices.length === 0}
                            className="submit-button"
                        >
                            {loading ? 'Creating...' : 'Start Download'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
