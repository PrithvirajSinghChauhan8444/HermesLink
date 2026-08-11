import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

function todayDDMMYYYY() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

export const createQueue = async (queueId, data) => {
    await setDoc(doc(db, 'queues', queueId), {
        name: data.name || queueId,
        max_parallel_jobs: data.max_parallel_jobs ?? 2,
        max_threads_per_job: data.max_threads_per_job ?? 4,
        priority: data.priority ?? 10,
        enabled: data.enabled ?? true,
        updated_on: todayDDMMYYYY(),
    });
};

export const updateQueue = async (queueId, data) => {
    await updateDoc(doc(db, 'queues', queueId), {
        ...data,
        updated_on: todayDDMMYYYY(),
    });
};

export const deleteQueue = async (queueId) => {
    if (queueId === 'default') {
        throw new Error('Cannot delete the default queue.');
    }
    await deleteDoc(doc(db, 'queues', queueId));
};
