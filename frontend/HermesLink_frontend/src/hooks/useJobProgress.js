import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { getCookie, setCookie } from '../utils/cookieUtils';

/**
 * Real-time hook that listens to the RTDB `jobs/${jobId}/progress` path.
 * Returns a live progress dictionary.
 *
 * @param {string} jobId - The ID of the job to monitor
 * @returns {Object|null} The current progress dictionary or null
 */
export function useJobProgress(jobId) {
    const cacheKey = jobId ? `hl_prog_${jobId}` : null;
    const [progress, setProgress] = useState(() => getCookie(cacheKey));

    useEffect(() => {
        if (!jobId) return;

        const progressRef = ref(rtdb, `jobs/${jobId}/progress`);
        
        const unsubscribe = onValue(progressRef, (snapshot) => {
            if (snapshot.exists()) {
                const val = snapshot.val();
                setProgress(val);
                setCookie(cacheKey, val, 1);
            } else {
                setProgress(null);
                setCookie(cacheKey, null, 1);
            }
        }, (error) => {
            console.error(`[useJobProgress] RTDB listener error for ${jobId}:`, error);
        });

        // Cleanup listener on unmount
        return () => {
            off(progressRef, 'value', unsubscribe);
        };
    }, [jobId, cacheKey]);

    return progress;
}

export default useJobProgress;
