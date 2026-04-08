import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCookie, setCookie } from '../utils/cookieUtils';

/**
 * Real-time hook that listens to the Firestore `jobs` collection.
 * Returns a live, sorted array of job documents.
 *
 * @param {Object} options
 * @param {string[]} [options.states] - optionally filter by job states
 */
export function useJobs({ states } = {}) {
    const cacheKey = states ? `hl_jobs_${states.join('_')}` : 'hl_jobs_all';

    const [jobs, setJobs] = useState(() => {
        const cached = getCookie(cacheKey);
        return cached || [];
    });
    
    const [loading, setLoading] = useState(() => {
        const cached = getCookie(cacheKey);
        return cached ? false : true;
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        const jobsRef = collection(db, 'jobs');
        const q = query(jobsRef, orderBy('created_at', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let jobList = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            }));

            // Optional state filter
            if (states && states.length > 0) {
                jobList = jobList.filter((job) => states.includes(job.state));
            }

            setJobs(jobList);
            setLoading(false);
            setError(null);
            setCookie(cacheKey, jobList, 1); // Cache for 1 day
        }, (err) => {
            console.error('[useJobs] Firestore listener error:', err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [cacheKey, JSON.stringify(states)]);

    return { jobs, loading, error };
}

export default useJobs;
