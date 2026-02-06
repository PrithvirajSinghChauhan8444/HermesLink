import { useState, useEffect, useCallback } from 'react';
import { fetchActiveJobs, fetchJobHistory, fetchAllJobs } from '../services/api';

/**
 * Custom hook for fetching and managing job data
 * 
 * @param {'active' | 'history' | 'all'} type - Type of jobs to fetch
 * @param {number} refreshInterval - Auto-refresh interval in ms (0 to disable)
 * @returns {{ jobs: Array, loading: boolean, error: string|null, refresh: Function }}
 */
export function useJobs(type = 'all', refreshInterval = 0) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            let response;

            switch (type) {
                case 'active':
                    response = await fetchActiveJobs();
                    break;
                case 'history':
                    response = await fetchJobHistory();
                    break;
                default:
                    response = await fetchAllJobs();
            }

            setJobs(response.jobs || []);
        } catch (err) {
            setError(err.message || 'Failed to fetch jobs');
            console.error('useJobs error:', err);
        } finally {
            setLoading(false);
        }
    }, [type]);

    // Initial fetch
    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    // Auto-refresh if interval is set
    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(fetchData, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, fetchData]);

    return { jobs, loading, error, refresh: fetchData };
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format date string to locale format
 */
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
}

/**
 * Extract filename from path or URL
 */
export function extractFilename(job) {
    // Try progress filename first
    if (job.progress?.filename) {
        const parts = job.progress.filename.split(/[/\\]/);
        return parts[parts.length - 1];
    }
    // Fall back to URL
    if (job.engine_config?.url) {
        try {
            const url = new URL(job.engine_config.url);
            const path = decodeURIComponent(url.pathname);
            const parts = path.split('/');
            return parts[parts.length - 1] || 'Unknown';
        } catch {
            return 'Unknown';
        }
    }
    return 'Unknown';
}
