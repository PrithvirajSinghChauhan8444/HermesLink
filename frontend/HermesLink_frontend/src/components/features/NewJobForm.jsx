import { useNewJobForm } from '../../hooks/useNewJobForm';

export default function NewJobForm({ onClose, onJobCreated, isOpen }) {
    const form = useNewJobForm({ isOpen, onClose, onJobCreated });

    return (
        <form 
            onSubmit={(e) => { 
                e.preventDefault(); 
                if (form.currentStep === 3) form.handleSubmit(e); 
            }} 
            className="modal-form"
        >
            {form.currentStep === 1 && (
                <div className="step-fields-container">
                    {/* Mode Toggle */}
                    <div className="mode-toggle-row">
                        <button
                            type="button"
                            onClick={() => form.setBatchMode(false)}
                            className={`mode-toggle-pill ${!form.batchMode ? 'active' : ''}`}
                        >
                            Single URL
                        </button>
                        <button
                            type="button"
                            onClick={() => form.setBatchMode(true)}
                            className={`mode-toggle-pill ${form.batchMode ? 'active' : ''}`}
                        >
                            Batch Import
                        </button>
                    </div>

                    {/* URL Input — single or batch */}
                    {!form.batchMode ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">URL</label>
                                <input
                                    type="text"
                                    value={form.url}
                                    onChange={(e) => form.setUrl(e.target.value)}
                                    placeholder="https://example.com/file.zip"
                                    className="form-input"
                                    required={!form.batchMode}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    File Name {form.fetchingFileName && <span style={{ fontSize: '12px', color: '#a3a3a3', marginLeft: '8px' }}>⏱️ Fetching...</span>}
                                </label>
                                <input
                                    type="text"
                                    value={form.useCustomName ? form.byUserFileName : (form.fetchingFileName ? 'Fetching...' : form.originalFileName)}
                                    onChange={(e) => {
                                        if (form.useCustomName) {
                                            form.setByUserFileName(e.target.value);
                                        }
                                    }}
                                    disabled={!form.useCustomName || form.fetchingFileName}
                                    placeholder="original_filename.ext"
                                    className="form-input"
                                    style={{ opacity: (!form.useCustomName || form.fetchingFileName) ? 0.7 : 1 }}
                                />
                                
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: 'pointer', fontSize: '13px', color: '#d1d5db', marginTop: '8px'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={form.useCustomName}
                                        onChange={(e) => {
                                            form.setUseCustomName(e.target.checked);
                                            if (!e.target.checked) {
                                                form.setByUserFileName(form.originalFileName);
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
                                    {form.batchUrls.split('\n').filter(u => u.trim()).length} URL(s)
                                </span>
                            </label>
                            <textarea
                                value={form.batchUrls}
                                onChange={(e) => form.setBatchUrls(e.target.value)}
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
                                    onChange={form.handleFileImport}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select
                                value={form.type}
                                onChange={(e) => form.setType(e.target.value)}
                                className="form-select"
                            >
                                <option value="aria2">Aria2 (Default)</option>
                                <option value="yt-dlp">yt-dlp (YouTube/Media)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Queue</label>
                            <select
                                value={form.queueId}
                                onChange={(e) => form.setQueueId(e.target.value)}
                                className="form-select"
                            >
                                <option value="auto">🌟 Auto-detect Routing</option>
                                {form.queues.map(q => (
                                    <option key={q.queue_id} value={q.queue_id}>
                                        {q.name || q.queue_id} (P: {q.priority})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {form.type === 'yt-dlp' && (
                        <div className="form-group mb-4">
                            <label className="form-label">Format Selection</label>
                            <div className="flex gap-2">
                                <select 
                                    className="form-select flex-1 w-full"
                                    value={form.selectedFormat}
                                    onChange={(e) => form.setSelectedFormat(e.target.value)}
                                >
                                    <option value="">🌟 Best Quality (Auto-Merge)</option>
                                    
                                    {form.formats.length > 0 && (
                                        <>
                                            <optgroup label="Audio Only">
                                                {form.formats.filter(f => f.vcodec === 'none' || !f.vcodec).map(f => (
                                                    <option key={f.format_id} value={f.format_id}>
                                                        🎵 Audio: {f.ext.toUpperCase()} | {f.filesize ? `${(f.filesize / 1024 / 1024).toFixed(1)} MB` : '~ Size'}
                                                    </option>
                                                ))}
                                            </optgroup>

                                            <optgroup label="Video + Audio">
                                                {form.formats.filter(f => f.vcodec && f.vcodec !== 'none').map(f => {
                                                    const value = (f.acodec === 'none' || !f.acodec) ? `${f.format_id}+ba/b` : f.format_id;
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
                                    onClick={form.handleFetchFormats}
                                    disabled={form.fetchingFormats || !form.url}
                                    className="fetch-formats-btn"
                                >
                                    {form.fetchingFormats ? 'Fetching...' : 'Fetch Formats'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {form.currentStep === 2 && (
                <div className="step-fields-container-visible">
                    {/* Device Selector */}
                    <div className="form-group">
                        <label className="form-label">Device</label>
                        {form.devices.length === 0 ? (
                            <div className="device-selector-empty">
                                <span>⚠️ No devices found. Connect a HermesLink agent first.</span>
                            </div>
                        ) : (
                            <select
                                value={form.selectedDevice?.device_id || ''}
                                onChange={(e) => {
                                    const dev = form.devices.find(d => d.device_id === e.target.value);
                                    form.setSelectedDevice(dev || null);
                                }}
                                className="form-select"
                                required
                            >
                                <option value="" disabled>Select a device...</option>
                                {form.devices.map(device => (
                                    <option key={device.device_id} value={device.device_id}>
                                        {device.status === 'online' ? '🟢' : '🔴'} {device.name} ({device.platform}) {device.status === 'offline' ? '(Offline)' : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Storage Profile</label>
                        {(!form.selectedDevice || !form.selectedDevice.storage_profiles || Object.keys(form.selectedDevice.storage_profiles).length === 0) ? (
                            <select disabled className="form-select opacity-50 cursor-not-allowed">
                                <option>Default Storage</option>
                            </select>
                        ) : (
                            <select
                                value={form.selectedStorageProfile}
                                onChange={(e) => {
                                    form.setSelectedStorageProfile(e.target.value);
                                    form.setDestinationPathIndex(0);
                                }}
                                className="form-select"
                                required
                            >
                                {Object.entries(form.selectedDevice.storage_profiles).map(([p_id, p_info]) => (
                                    <option key={p_id} value={p_id}>
                                        {p_info.name || p_id}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Destination Path */}
                    {form.profilePaths.length > 1 && (
                        <div className="form-group">
                            <label className="form-label">Destination</label>
                            <select
                                value={form.destinationPathIndex}
                                onChange={(e) => form.setDestinationPathIndex(Number(e.target.value))}
                                className="form-select"
                            >
                                {form.profileBaseNames.map((name, idx) => (
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
                                value={form.destination}
                                onChange={(e) => {
                                    form.setDestination(e.target.value);
                                    form.setShowSuggestions(true);
                                }}
                                onFocus={() => form.setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => form.setShowSuggestions(false), 200)}
                                placeholder="Type a new folder name or select..."
                                className="form-input pr-10"
                                autoComplete="off"
                            />
                            {Array.isArray(form.selectedDevice?.storage_profiles?.[form.selectedStorageProfile]?.subfolders) && 
                             form.selectedDevice.storage_profiles[form.selectedStorageProfile].subfolders.length > 0 && (
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    onClick={() => form.setShowSuggestions(!form.showSuggestions)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m6 9 6 6 6-6"/>
                                    </svg>
                                </button>
                            )}
                        </div>

                        {form.showSuggestions && 
                         Array.isArray(form.selectedDevice?.storage_profiles?.[form.selectedStorageProfile]?.subfolders) && 
                         form.selectedDevice.storage_profiles[form.selectedStorageProfile].subfolders.length > 0 && (
                            <div className="suggestions-list">
                                {form.selectedDevice.storage_profiles[form.selectedStorageProfile].subfolders.map((folder, idx) => {
                                    const folderName = folder.split('/').filter(Boolean).pop();
                                    if (!folderName) return null;
                                    
                                    if (form.destination && !folderName.toLowerCase().includes(form.destination.toLowerCase())) return null;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            className="suggestion-item"
                                            onClick={() => {
                                                form.setDestination(folderName);
                                                form.setShowSuggestions(false);
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

            {form.currentStep === 3 && (
                <div className="step-fields-container-visible">
                    <div className="form-group">
                        <label className="form-label">Schedule Download (Optional)</label>
                        <input
                            type="datetime-local"
                            value={form.scheduledAt}
                            onChange={(e) => form.setScheduledAt(e.target.value)}
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
                                checked={form.autoExtract}
                                onChange={(e) => form.setAutoExtract(e.target.checked)}
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
                                checked={form.dynamicFolder}
                                onChange={(e) => form.setDynamicFolder(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: '#ffffff' }}
                            />
                            📁 Dynamic folder creation (organized storage by category)
                        </label>
                    </div>
                </div>
            )}

            {form.error && (
                <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {form.error}
                </div>
            )}

            <div className="modal-actions">
                {form.currentStep === 1 ? (
                    <button type="button" onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                ) : (
                    <button type="button" onClick={form.handleBack} className="cancel-button">
                        Back
                    </button>
                )}

                <div className="dots-container">
                    <span 
                        className={`dot-node ${form.currentStep === 1 ? 'active' : ''}`} 
                        onClick={() => { if (form.url || form.batchMode) form.setCurrentStep(1); }}
                        title="URL & Name"
                    />
                    <span 
                        className={`dot-node ${form.currentStep === 2 ? 'active' : ''}`} 
                        onClick={() => {
                            if (form.batchMode) {
                                const urls = form.batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
                                if (urls.length > 0) form.setCurrentStep(2);
                            } else if (form.url) {
                                form.setCurrentStep(2);
                            }
                        }}
                        title="Device & Path"
                    />
                    <span 
                        className={`dot-node ${form.currentStep === 3 ? 'active' : ''}`} 
                        onClick={() => {
                            if (form.batchMode) {
                                const urls = form.batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
                                if (urls.length > 0 && form.selectedDevice) form.setCurrentStep(3);
                            } else if (form.url && form.selectedDevice) {
                                form.setCurrentStep(3);
                            }
                        }}
                        title="Options"
                    />
                </div>

                {form.currentStep < 3 ? (
                    <button type="button" onClick={form.handleNext} className="submit-button">
                        Next
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={form.loading || form.devices.length === 0}
                        className="submit-button"
                    >
                        {form.loading ? 'Creating...' : 'Start Download'}
                    </button>
                )}
            </div>
        </form>
    );
}
