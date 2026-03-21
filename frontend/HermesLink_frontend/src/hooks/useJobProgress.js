import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../config/firebase';

/**
 * Real-time hook that listens to the RTDB `jobs/${jobId}/progress` path.
 * Returns a live progress dictionary.
 *
 * @param {string} jobId - The ID of the job to monitor
 * @returns {Object|null} The current progress dictionary or null
 */
export function useJobProgress(jobId) {
    const [progress, setProgress] = useState(null);

    useEffect(() => {
        if (!jobId) return;

        const progressRef = ref(rtdb, `jobs/${jobId}/progress`);
        
        const unsubscribe = onValue(progressRef, (snapshot) => {
            if (snapshot.exists()) {
                setProgress(snapshot.val());
            } else {
                setProgress(null);
            }
        }, (error) => {
            console.error(`[useJobProgress] RTDB listener error for ${jobId}:`, error);
        });

        // Cleanup listener on unmount
        return () => {
            off(progressRef, 'value', unsubscribe);
        };
    }, [jobId]);

    return progress;
}

export default useJobProgress;
