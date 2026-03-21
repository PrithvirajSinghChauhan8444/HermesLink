import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Real-time hook that listens to the Firestore `jobs` collection.
 * Returns a live, sorted array of job documents.
 *
 * @param {Object} options
 * @param {string[]} [options.states] - optionally filter by job states
 */
export function useJobs({ states } = {}) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

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
        }, (error) => {
            console.error('[useJobs] Firestore listener error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [JSON.stringify(states)]);

    return { jobs, loading };
}

export default useJobs;
