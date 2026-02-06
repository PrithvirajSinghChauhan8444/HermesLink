/**
 * HermesLink API Client
 * 
 * Provides functions to fetch job and queue data from the backend API.
 */

const API_BASE = 'http://localhost:8000/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `API Error: ${response.status}`);
    }
    return response.json();
}

/**
 * Fetch all jobs
 * @returns {Promise<{jobs: Array, total: number}>}
 */
export async function fetchAllJobs() {
    return apiFetch('/jobs');
}

/**
 * Fetch active jobs (PENDING, RUNNING, PAUSED)
 * @returns {Promise<{jobs: Array, total: number}>}
 */
export async function fetchActiveJobs() {
    return apiFetch('/jobs/active');
}

/**
 * Fetch job history (COMPLETED, FAILED, STOPPED)
 * @returns {Promise<{jobs: Array, total: number}>}
 */
export async function fetchJobHistory() {
    return apiFetch('/jobs/history');
}

/**
 * Fetch a single job by ID
 * @param {string} jobId 
 * @returns {Promise<Object>}
 */
export async function fetchJob(jobId) {
    return apiFetch(`/jobs/${jobId}`);
}

/**
 * Fetch all queue configurations
 * @returns {Promise<{queues: Array}>}
 */
export async function fetchQueues() {
    return apiFetch('/queues');
}

/**
 * Reload jobs from disk
 * @returns {Promise<{status: string, total_jobs: number}>}
 */
export async function reloadJobs() {
    const response = await fetch(`${API_BASE}/jobs/reload`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to reload jobs: ${response.status}`);
    }
    return response.json();
}
