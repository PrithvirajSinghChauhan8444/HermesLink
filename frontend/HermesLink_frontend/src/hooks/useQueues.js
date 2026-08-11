import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createQueue, updateQueue, deleteQueue } from '../services/queueService';

function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/**
 * Real-time Firestore hook for the `queues` collection.
 * Returns queue list + CRUD helpers.
 */
export function useQueues() {
    const cacheKey = 'hl_queues';

    const [queues, setQueues] = useState(() => {
        const cached = lsGet(cacheKey);
        return cached || [];
    });

    const [loading, setLoading] = useState(() => {
        const cached = lsGet(cacheKey);
        return !cached;
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        const queuesRef = collection(db, 'queues');

        const unsubscribe = onSnapshot(queuesRef, (snapshot) => {
            const queueList = snapshot.docs.map((d) => ({
                ...d.data(),
                queue_id: d.id,
            }));
            setQueues(queueList);
            setLoading(false);
            setError(null);
            lsSet(cacheKey, queueList);
        }, (err) => {
            console.error('[useQueues] Firestore listener error:', err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { 
        queues, 
        loading, 
        error, 
        createQueue, 
        updateQueue, 
        deleteQueue 
    };
}

export default useQueues;
