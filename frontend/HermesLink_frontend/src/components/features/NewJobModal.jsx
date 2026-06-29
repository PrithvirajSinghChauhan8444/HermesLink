import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { api } from '../../services/api';
import { useDevices } from '../../hooks/useDevices';
import { useQueues } from '../../hooks/useQueues';
import './NewJobModal.css';

export default function NewJobModal({ isOpen, onClose, onJobCreated }) {
    const [url, setUrl] = useState('');
    const [type, setType] = useState('aria2');
    const [queueId, setQueueId] = useState('auto');
    const [destination, setDestination] = useState('');
    const [selectedStorageProfile, setSelectedStorageProfile] = useState('default');
    const [destinationPathIndex, setDestinationPathIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [formats, setFormats] = useState([]);
    const [selectedFormat, setSelectedFormat] = useState('');
    const [fetchingFormats, setFetchingFormats] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [batchMode, setBatchMode] = useState(false);
    const [batchUrls, setBatchUrls] = useState('');
    const [autoExtract, setAutoExtract] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // New custom naming & folder routing states
    const [originalFileName, setOriginalFileName] = useState('');
    const [byUserFileName, setByUserFileName] = useState('');
    const [useCustomName, setUseCustomName] = useState(false);
    const [fetchingFileName, setFetchingFileName] = useState(false);
    const [dynamicFolder, setDynamicFolder] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);

    const { devices } = useDevices();
    const { queues } = useQueues();

    useEffect(() => {
        if (isOpen) {
            setUrl('');
            setType('aria2');
            setQueueId('auto');
            setDestination('');
            setSelectedStorageProfile('default');
            setDestinationPathIndex(0);
            setError(null);
            setSelectedDevice(null);
            setFormats([]);
            setSelectedFormat('');
            setFetchingFormats(false);
            setScheduledAt('');
            setBatchMode(false);
            setBatchUrls('');
            setAutoExtract(false);
            
            // Reset custom filename & routing states
            setOriginalFileName('');
            setByUserFileName('');
            setUseCustomName(false);
            setFetchingFileName(false);
            setDynamicFolder(true);
            setCurrentStep(1);
        }
    }, [isOpen]);

    // Auto-select the first device when devices load (prefer online if available)
    useEffect(() => {
        if (isOpen && devices.length > 0 && !selectedDevice) {
            const online = devices.find(d => d.status === 'online');
            setSelectedDevice(online || devices[0]);
        }
    }, [devices, isOpen]);

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

    // Fetch original filename when URL changes (with 600ms debounce)
    useEffect(() => {
        if (!url || batchMode || !url.startsWith('http')) {
            setOriginalFileName('');
            if (!useCustomName) {
                setByUserFileName('');
            }
            return;
        }

        const timer = setTimeout(async () => {
            setFetchingFileName(true);
            try {
                // 1. If it's a YouTube URL, try to get the actual video title directly
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    let fetchedTitle = null;
                    try {
                        const res = await api.get('/yt-dlp/info', { params: { url } });
                        fetchedTitle = res.data.title;
                    } catch (e) {
                        try {
                            const res = await fetch(`/api/yt-dlp/info?url=${encodeURIComponent(url)}`);
                            if (res.ok) {
                                const data = await res.json();
                                fetchedTitle = data.title;
                            }
                        } catch (err) {}
                    }
                    if (fetchedTitle) {
                        setOriginalFileName(fetchedTitle);
                        if (!useCustomName) {
                            setByUserFileName(fetchedTitle);
                        }
                        return;
                    }
                }

                // 2. Otherwise use the standard filename resolver
                const response = await api.get('/resolve-filename', { params: { url } });
                const fetchedName = response.data.filename || '';
                setOriginalFileName(fetchedName);
                if (!useCustomName) {
                    setByUserFileName(fetchedName);
                }
            } catch (err) {
                console.error("Failed to fetch filename:", err);
                try {
                    const parsedUrl = new URL(url);
                    const pathName = parsedUrl.pathname;
                    const fallbackName = pathName.substring(pathName.lastIndexOf('/') + 1) || 'download';
                    setOriginalFileName(fallbackName);
                    if (!useCustomName) {
                        setByUserFileName(fallbackName);
                    }
                } catch (e) {
                    // Ignore URL parsing errors
                }
            } finally {
                setFetchingFileName(false);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [url, batchMode, useCustomName]);

    // Get paths for the currently selected profile
    const selectedProfileData = selectedDevice?.storage_profiles?.[selectedStorageProfile];
    const profilePaths = selectedProfileData?.paths || [];
    const profileBaseNames = selectedProfileData?.base_names || profilePaths.map(p => p.split('/').filter(Boolean).pop() || p);

    const handleFetchFormats = async () => {
        if (!url) return;
        setFetchingFormats(true);
        setError(null);
        try {
            // 1. Try fetching from the main API (pointing to your home PC backend)
            const response = await api.get('/yt-dlp/info', { params: { url } });
            setFormats(response.data.formats || []);
            if (response.data.formats && response.data.formats.length > 0) {
                setSelectedFormat(response.data.formats[0].format_id);
            }
        } catch (err) {
            console.warn("Primary API failed, falling back to Vercel serverless metadata fetch:", err);
            try {
                // Fetch cookies from Firestore securely
                let cookiesText = null;
                try {
                    const cookieDoc = await getDoc(doc(db, 'cookies', 'youtube'));
                    if (cookieDoc.exists()) {
                        cookiesText = cookieDoc.data().cookies_text;
                    }
                } catch (dbErr) {
                    console.warn("Could not read cookies from Firestore:", dbErr);
                }

                // 2. Fall back to Vercel's serverless endpoint (uses POST)
                const fallbackResponse = await fetch(`/api/yt-dlp/info`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: url,
                        cookies: cookiesText
                    })
                });
                if (!fallbackResponse.ok) {
                    throw new Error("Vercel serverless request failed");
                }
                const data = await fallbackResponse.json();
                setFormats(data.formats || []);
                if (data.formats && data.formats.length > 0) {
                    setSelectedFormat(data.formats[0].format_id);
                }
                // If it returned the video title (e.g. from oEmbed fallback), prefill it
                if (data.title) {
                    setOriginalFileName(data.title);
                    if (!useCustomName) {
                        setByUserFileName(data.title);
                    }
                }
            } catch (fallbackErr) {
                setError(err.response?.data?.detail || err.message || "Failed to fetch formats");
            }
        } finally {
            setFetchingFormats(false);
        }
    };
    const handleFileImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setBatchUrls(prev => prev ? prev + '\n' + ev.target.result : ev.target.result);
        };
        reader.readAsText(file);
        e.target.value = ''; // reset so the same file can be re-imported
    };

    const handleNext = (e) => {
        e?.preventDefault();
        // Validation for Step 1
        if (currentStep === 1) {
            if (batchMode) {
                const urls = batchUrls
                    .split('\n')
                    .map(u => u.trim())
                    .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('magnet:')));
                if (urls.length === 0) {
                    setError('No valid URLs found. Each line should be a URL starting with http(s):// or magnet:');
                    return;
                }
            } else {
                if (!url) {
                    setError('Please enter a URL.');
                    return;
                }
            }
            setError(null);
        }
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = (e) => {
        e?.preventDefault();
        setError(null);
        setCurrentStep(prev => prev - 1);
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
            // Collect URLs: single mode or batch mode
            let urls = [];
            if (batchMode) {
                urls = batchUrls
                    .split('\n')
                    .map(u => u.trim())
                    .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('magnet:')));
                if (urls.length === 0) {
                    setError('No valid URLs found. Each line should be a URL starting with http(s):// or magnet:');
                    setLoading(false);
                    return;
                }
            } else {
                if (!url) {
                    setError('Please enter a URL.');
                    setLoading(false);
                    return;
                }
                urls = [url];
            }

            // Create a separate job for each URL
            for (const jobUrl of urls) {
                let urlOriginalName = '';
                try {
                    const parsedUrl = new URL(jobUrl);
                    const pathName = parsedUrl.pathname;
                    urlOriginalName = pathName.substring(pathName.lastIndexOf('/') + 1) || 'download';
                } catch (e) {
                    urlOriginalName = 'download';
                }

                const payloadOriginalName = batchMode ? urlOriginalName : (originalFileName || urlOriginalName);
                const payloadByUser = batchMode ? urlOriginalName : (useCustomName ? (byUserFileName || originalFileName || urlOriginalName) : (originalFileName || urlOriginalName));

                const jobPayload = {
                    device_id: selectedDevice.device_id,
                    state: 'PENDING',
                    queue_id: queueId,
                    engine_config: {
                        url: jobUrl,
                        type,
                        storage_profile_id: selectedStorageProfile,
                        destination_path_index: destinationPathIndex,
                        sub_directory: destination || "",
                        auto_extract: autoExtract,
                        original_file_name: payloadOriginalName,
                        by_user_file_name: payloadByUser,
                        dynamic_folder: dynamicFolder,
                        ...(type === 'yt-dlp' && selectedFormat ? { format: selectedFormat } : {}),
                    },
                    progress: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                if (scheduledAt) {
                    jobPayload.scheduled_at = new Date(scheduledAt).toISOString();
                }

                await addDoc(collection(db, 'jobs'), jobPayload);
            }

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
        <div className="new-job-modal-overlay" onWheel={(e) => e.stopPropagation()}>
            <div className="new-job-modal-container">
                <div className="modal-glow-blob-1" />
                <div className="modal-glow-blob-2" />
                <div className="modal-header">
                    <h2 className="modal-title">New Download</h2>
                    <button onClick={onClose} className="close-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); if (currentStep === 3) handleSubmit(e); }} className="modal-form">

                    {currentStep === 1 && (
                        <div className="step-fields-container">
                            {/* Mode Toggle */}
                            <div className="mode-toggle-row">
                                <button
                                    type="button"
                                    onClick={() => setBatchMode(false)}
                                    className={`mode-toggle-pill ${!batchMode ? 'active' : ''}`}
                                >Single URL</button>
                                <button
                                    type="button"
                                    onClick={() => setBatchMode(true)}
                                    className={`mode-toggle-pill ${batchMode ? 'active' : ''}`}
                                >Batch Import</button>
                            </div>

                            {/* URL Input — single or batch */}
                            {!batchMode ? (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">URL</label>
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://example.com/file.zip"
                                            className="form-input"
                                            required={!batchMode}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            File Name {fetchingFileName && <span style={{ fontSize: '12px', color: '#a3a3a3', marginLeft: '8px' }}>⏱️ Fetching...</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={useCustomName ? byUserFileName : (fetchingFileName ? 'Fetching...' : originalFileName)}
                                            onChange={(e) => {
                                                if (useCustomName) {
                                                    setByUserFileName(e.target.value);
                                                }
                                            }}
                                            disabled={!useCustomName || fetchingFileName}
                                            placeholder="original_filename.ext"
                                            className="form-input"
                                            style={{ opacity: (!useCustomName || fetchingFileName) ? 0.7 : 1 }}
                                        />
                                        
                                        <label style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            cursor: 'pointer', fontSize: '13px', color: '#d1d5db', marginTop: '8px'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={useCustomName}
                                                onChange={(e) => {
                                                    setUseCustomName(e.target.checked);
                                                    if (!e.target.checked) {
                                                        setByUserFileName(originalFileName);
                                                    }
                                                }}
                                                style={{ width: '15px', height: '15px', accentColor: '#ffffff' }}
                                            />
                                            Use custom name
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <div className="form-group">
                                    <label className="form-label">
                                        URLs (one per line)
                                        <span style={{ float: 'right', fontSize: '11px', color: '#6b7280' }}>
                                            {batchUrls.split('\n').filter(u => u.trim()).length} URL(s)
                                        </span>
                                    </label>
                                    <textarea
                                        value={batchUrls}
                                        onChange={(e) => setBatchUrls(e.target.value)}
                                        placeholder={"https://example.com/file1.zip\nhttps://example.com/file2.zip\nhttps://example.com/file3.zip"}
                                        className="form-input"
                                        rows={5}
                                        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                                    />
                                    <label
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            marginTop: '8px', padding: '6px 12px', borderRadius: '6px',
                                            border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer',
                                            fontSize: '12px', color: '#9ca3af', transition: 'all 0.2s'
                                        }}
                                    >
                                        📄 Import from .txt file
                                        <input
                                            type="file"
                                            accept=".txt"
                                            onChange={handleFileImport}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="aria2">Aria2 (Default)</option>
                                        <option value="yt-dlp">yt-dlp (YouTube/Media)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Queue</label>
                                    <select
                                        value={queueId}
                                        onChange={(e) => setQueueId(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="auto">🌟 Auto-detect Routing</option>
                                        {queues.map(q => (
                                            <option key={q.queue_id} value={q.queue_id}>
                                                {q.name || q.queue_id} (P: {q.priority})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {type === 'yt-dlp' && (
                                <div className="form-group mb-4">
                                    <label className="form-label">Format Selection</label>
                                    <div className="flex gap-2">
                                        <select 
                                            className="form-select flex-1 w-full"
                                            value={selectedFormat}
                                            onChange={(e) => setSelectedFormat(e.target.value)}
                                            disabled={formats.length === 0}
                                        >
                                            {formats.length === 0 ? (
                                                <option value="">Fetch to select exactly...</option>
                                            ) : (
                                                <>
                                                    <option value="">🌟 Best Quality (Auto-Merge)</option>
                                                    
                                                    <optgroup label="Audio Only">
                                                        {formats.filter(f => f.vcodec === 'none').map(f => (
                                                            <option key={f.format_id} value={f.format_id}>
                                                                🎵 Audio: {f.ext.toUpperCase()} | {f.filesize ? `${(f.filesize / 1024 / 1024).toFixed(1)} MB` : '~ Size'}
                                                            </option>
                                                        ))}
                                                    </optgroup>

                                                    <optgroup label="Video + Audio">
                                                        {formats.filter(f => f.vcodec !== 'none').map(f => {
                                                            const value = f.acodec === 'none' ? `${f.format_id}+ba/b` : f.format_id;
                                                            return (
                                                                <option key={f.format_id} value={value}>
                                                                    🎥 {f.resolution} {f.ext.toUpperCase()} | {f.filesize ? `${(f.filesize / 1024 / 1024).toFixed(1)} MB` : '~ Size'}
                                                                </option>
                                                            );
                                                        })}
                                                    </optgroup>
                                                </>
                                            )}
                                        </select>
                                        <button 
                                            type="button"
                                            onClick={handleFetchFormats}
                                            disabled={fetchingFormats || !url}
                                            className="fetch-formats-btn"
                                        >
                                            {fetchingFormats ? 'Fetching...' : 'Fetch Formats'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="step-fields-container-visible">
                            {/* Device Selector */}
                            <div className="form-group">
                                <label className="form-label">Device</label>
                                {devices.length === 0 ? (
                                    <div className="device-selector-empty">
                                        <span>⚠️ No devices found. Connect a HermesLink agent first.</span>
                                    </div>
                                ) : (
                                    <select
                                        value={selectedDevice?.device_id || ''}
                                        onChange={(e) => {
                                            const dev = devices.find(d => d.device_id === e.target.value);
                                            setSelectedDevice(dev || null);
                                        }}
                                        className="form-select"
                                        required
                                    >
                                        <option value="" disabled>Select a device...</option>
                                        {devices.map(device => (
                                            <option key={device.device_id} value={device.device_id}>
                                                {device.status === 'online' ? '🟢' : '🔴'} {device.name} ({device.platform}) {device.status === 'offline' ? '(Offline)' : ''}
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

                            <div className="form-group relative">
                                <label className="form-label">Sub-directory (Optional)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={destination}
                                        onChange={(e) => {
                                            setDestination(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        placeholder="Type a new folder name or select..."
                                        className="form-input pr-10"
                                        autoComplete="off"
                                    />
                                    {Array.isArray(selectedDevice?.storage_profiles?.[selectedStorageProfile]?.subfolders) && 
                                     selectedDevice.storage_profiles[selectedStorageProfile].subfolders.length > 0 && (
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                            onClick={() => setShowSuggestions(!showSuggestions)}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m6 9 6 6 6-6"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {showSuggestions && 
                                 Array.isArray(selectedDevice?.storage_profiles?.[selectedStorageProfile]?.subfolders) && 
                                 selectedDevice.storage_profiles[selectedStorageProfile].subfolders.length > 0 && (
                                    <div className="suggestions-list">
                                        {selectedDevice.storage_profiles[selectedStorageProfile].subfolders.map((folder, idx) => {
                                            const folderName = folder.split('/').filter(Boolean).pop();
                                            if (!folderName) return null;
                                            
                                            // Simple filtering based on input
                                            if (destination && !folderName.toLowerCase().includes(destination.toLowerCase())) return null;

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className="suggestion-item"
                                                    onClick={() => {
                                                        setDestination(folderName);
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    📁 {folderName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="step-fields-container-visible">
                            <div className="form-group">
                                <label className="form-label">Schedule Download (Optional)</label>
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            {/* Auto-Extract Toggle */}
                            <div className="form-group">
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    cursor: 'pointer', fontSize: '13px', color: '#d1d5db'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={autoExtract}
                                        onChange={(e) => setAutoExtract(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#ffffff' }}
                                    />
                                    📦 Auto-extract archives (.zip, .tar, .gz, .rar) after download
                                </label>
                            </div>

                            {/* Dynamic Folder Routing Toggle */}
                            <div className="form-group">
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    cursor: 'pointer', fontSize: '13px', color: '#d1d5db'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={dynamicFolder}
                                        onChange={(e) => setDynamicFolder(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#ffffff' }}
                                    />
                                    📁 Dynamic folder creation (organized storage by category)
                                </label>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                                        {currentStep === 1 ? (
                                            <button type="button" onClick={onClose} className="cancel-button">
                                                Cancel
                                            </button>
                                        ) : (
                                            <button type="button" onClick={handleBack} className="cancel-button">
                                                Back
                                            </button>
                                        )}

                                        <div className="dots-container">
                                            <span 
                                                className={`dot-node ${currentStep === 1 ? 'active' : ''}`} 
                                                onClick={() => { if (url || batchMode) setCurrentStep(1); }}
                                                title="URL & Name"
                                            />
                                            <span 
                                                className={`dot-node ${currentStep === 2 ? 'active' : ''}`} 
                                                onClick={() => {
                                                    if (batchMode) {
                                                        const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
                                                        if (urls.length > 0) setCurrentStep(2);
                                                    } else if (url) {
                                                        setCurrentStep(2);
                                                    }
                                                }}
                                                title="Device & Path"
                                            />
                                            <span 
                                                className={`dot-node ${currentStep === 3 ? 'active' : ''}`} 
                                                onClick={() => {
                                                    if (batchMode) {
                                                        const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
                                                        if (urls.length > 0 && selectedDevice) setCurrentStep(3);
                                                    } else if (url && selectedDevice) {
                                                        setCurrentStep(3);
                                                    }
                                                }}
                                                title="Options"
                                            />
                                        </div>

                                        {currentStep < 3 ? (
                                            <button type="button" onClick={handleNext} className="submit-button">
                                                Next
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                disabled={loading || devices.length === 0}
                                                className="submit-button"
                                            >
                                                {loading ? 'Creating...' : 'Start Download'}
                                            </button>
                                        )}
                                    </div>
                </form>
            </div>
        </div>
    );
}
