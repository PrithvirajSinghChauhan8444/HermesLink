import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { createQueue, updateQueue, deleteQueue } from '../services/queueService';
import { demoSimulator } from '../services/demoSimulator';

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
    const isDemo = !isFirebaseConfigured || localStorage.getItem('hl_demo_mode') === 'true';
    const cacheKey = 'hl_queues';

    const [queues, setQueues] = useState(() => {
        if (isDemo) {
            return demoSimulator.getQueues();
        }
        const cached = lsGet(cacheKey);
        return cached || [];
    });

    const [loading, setLoading] = useState(() => {
        if (isDemo) return false;
        const cached = lsGet(cacheKey);
        return !cached;
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        if (isDemo) {
            const unsubscribe = demoSimulator.subscribe(() => {
                setQueues(demoSimulator.getQueues());
                setLoading(false);
            });
            return unsubscribe;
        }

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
    }, [isDemo]);

    return { 
        queues, 
        loading, 
        error, 
        createQueue: isDemo ? demoSimulator.createQueue.bind(demoSimulator) : createQueue, 
        updateQueue: isDemo ? demoSimulator.updateQueue.bind(demoSimulator) : updateQueue, 
        deleteQueue: isDemo ? demoSimulator.deleteQueue.bind(demoSimulator) : deleteQueue 
    };
}

export default useQueues;
