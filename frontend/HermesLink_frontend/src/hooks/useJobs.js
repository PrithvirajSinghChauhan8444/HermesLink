import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { demoSimulator } from '../services/demoSimulator';

function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/**
 * Real-time hook that listens to the Firestore `jobs` collection.
 * Returns a live, sorted array of job documents.
 *
 * @param {Object} options
 * @param {string[]} [options.states] - optionally filter by job states
 */
export function useJobs({ states } = {}) {
    const isDemo = !isFirebaseConfigured || localStorage.getItem('hl_demo_mode') === 'true';
    const cacheKey = states ? `hl_jobs_${states.join('_')}` : 'hl_jobs_all';

    const [jobs, setJobs] = useState(() => {
        if (isDemo) {
            let list = demoSimulator.getJobs();
            if (states && states.length > 0) {
                list = list.filter((job) => states.includes(job.state));
            }
            return list;
        }
        const cached = lsGet(cacheKey);
        return cached || [];
    });
    
    const [loading, setLoading] = useState(() => {
        if (isDemo) return false;
        const cached = lsGet(cacheKey);
        return cached ? false : true;
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        if (isDemo) {
            const unsubscribe = demoSimulator.subscribe(() => {
                let list = demoSimulator.getJobs();
                if (states && states.length > 0) {
                    list = list.filter((job) => states.includes(job.state));
                }
                setJobs(list);
                setLoading(false);
            });
            return unsubscribe;
        }

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
            lsSet(cacheKey, jobList);
        }, (err) => {
            console.error('[useJobs] Firestore listener error:', err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [cacheKey, JSON.stringify(states), isDemo]);

    return { jobs, loading, error };
}

export default useJobs;
