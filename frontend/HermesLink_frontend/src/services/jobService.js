import { api } from './api';

export const createJob = async (data) => {
    const response = await api.post('/jobs', data);
    return response.data;
};

export const sendJobAction = async (id, action) => {
    const response = await api.post(`/jobs/${id}/action`, { action });
    return response.data;
};

export const pauseJob = (id) => sendJobAction(id, 'PAUSE');
export const resumeJob = (id) => sendJobAction(id, 'RESUME');
export const stopJob = (id) => sendJobAction(id, 'STOP');
export const retryJob = (id) => sendJobAction(id, 'RETRY');
export const restartJob = (id) => sendJobAction(id, 'RESTART');
