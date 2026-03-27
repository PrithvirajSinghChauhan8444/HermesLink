import { useState, useEffect } from 'react';
import {
    collection, onSnapshot, doc,
    setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCookie, setCookie } from '../utils/cookieUtils';

/**
 * Real-time Firestore hook for the `queues` collection.
 * Returns queue list + CRUD helpers.
 *
 * Queue schema:
 *   { name, max_parallel_jobs, max_threads_per_job, priority, enabled, updated_on }
 *   updated_on is DD-MM-YYYY string.
 */

function todayDDMMYYYY() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

export function useQueues() {
    const cacheKey = 'hl_queues';

    const [queues, setQueues] = useState(() => {
        const cached = getCookie(cacheKey);
        return cached || [];
    });

    const [loading, setLoading] = useState(() => {
        const cached = getCookie(cacheKey);
        return !cached;
    });

    useEffect(() => {
        const queuesRef = collection(db, 'queues');

        const unsubscribe = onSnapshot(queuesRef, (snapshot) => {
            const queueList = snapshot.docs.map((d) => ({
                queue_id: d.id,
                ...d.data(),
            }));
            setQueues(queueList);
            setLoading(false);
            setCookie(cacheKey, queueList, 1);
        });

        return () => unsubscribe();
    }, []);

    /** Create a new queue. `queueId` becomes the document ID. */
    const createQueue = async (queueId, data) => {
        await setDoc(doc(db, 'queues', queueId), {
            name: data.name || queueId,
            max_parallel_jobs: data.max_parallel_jobs ?? 2,
            max_threads_per_job: data.max_threads_per_job ?? 4,
            priority: data.priority ?? 10,
            enabled: data.enabled ?? true,
            updated_on: todayDDMMYYYY(),
        });
    };

    /** Update fields on an existing queue. */
    const updateQueue = async (queueId, data) => {
        await updateDoc(doc(db, 'queues', queueId), {
            ...data,
            updated_on: todayDDMMYYYY(),
        });
    };

    /** Delete a queue (blocks deletion of "default"). */
    const deleteQueue = async (queueId) => {
        if (queueId === 'default') {
            throw new Error('Cannot delete the default queue.');
        }
        await deleteDoc(doc(db, 'queues', queueId));
    };

    return { queues, loading, createQueue, updateQueue, deleteQueue };
}

export default useQueues;
