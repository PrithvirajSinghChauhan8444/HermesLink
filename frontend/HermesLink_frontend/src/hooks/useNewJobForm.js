import { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { api } from '../services/api';
import { useDevices } from './useDevices';
import { useQueues } from './useQueues';

export function useNewJobForm({ isOpen, onClose, onJobCreated }) {
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

    // Custom naming & folder routing states
    const [originalFileName, setOriginalFileName] = useState('');
    const [byUserFileName, setByUserFileName] = useState('');
    const [useCustomName, setUseCustomName] = useState(false);
    const [fetchingFileName, setFetchingFileName] = useState(false);
    const [dynamicFolder, setDynamicFolder] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);

    const { devices } = useDevices();
    const { queues } = useQueues();

    // Reset state on open/close
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
            const response = await api.get('/yt-dlp/info', { params: { url } });
            setFormats(response.data.formats || []);
            if (response.data.formats && response.data.formats.length > 0) {
                setSelectedFormat(response.data.formats[0].format_id);
            }
        } catch (err) {
            console.warn("Primary API failed, falling back to Vercel serverless metadata fetch:", err);
            try {
                let cookiesText = null;
                try {
                    const cookieDoc = await getDoc(doc(db, 'cookies', 'youtube'));
                    if (cookieDoc.exists()) {
                        cookiesText = cookieDoc.data().cookies_text;
                    }
                } catch (dbErr) {
                    console.warn("Could not read cookies from Firestore:", dbErr);
                }

                const fallbackResponse = await fetch(`/api/yt-dlp/info`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url: url, cookies: cookiesText })
                });
                if (!fallbackResponse.ok) {
                    throw new Error("Vercel serverless request failed");
                }
                const data = await fallbackResponse.json();
                setFormats(data.formats || []);
                if (data.formats && data.formats.length > 0) {
                    setSelectedFormat(data.formats[0].format_id);
                }
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
        e.target.value = ''; 
    };

    const handleNext = (e) => {
        e?.preventDefault();
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

    return {
        url, setUrl,
        type, setType,
        queueId, setQueueId,
        destination, setDestination,
        selectedStorageProfile, setSelectedStorageProfile,
        destinationPathIndex, setDestinationPathIndex,
        loading,
        error, setError,
        selectedDevice, setSelectedDevice,
        formats,
        selectedFormat, setSelectedFormat,
        fetchingFormats,
        scheduledAt, setScheduledAt,
        batchMode, setBatchMode,
        batchUrls, setBatchUrls,
        autoExtract, setAutoExtract,
        showSuggestions, setShowSuggestions,
        originalFileName,
        byUserFileName, setByUserFileName,
        useCustomName, setUseCustomName,
        fetchingFileName,
        dynamicFolder, setDynamicFolder,
        currentStep, setCurrentStep,
        devices,
        queues,
        profilePaths,
        profileBaseNames,
        handleFetchFormats,
        handleFileImport,
        handleNext,
        handleBack,
        handleSubmit
    };
}
