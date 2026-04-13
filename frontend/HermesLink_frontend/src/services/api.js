import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

import { auth } from '../config/firebase';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to inject Firebase Auth Token into headers
api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const endpoints = {
    jobs: {
        list: () => api.get('/jobs'),
        active: () => api.get('/jobs/active'),
        history: () => api.get('/jobs/history'),
        get: (id) => api.get(`/jobs/${id}`),
        create: (data) => api.post('/jobs', data),
        action: (id, action) => api.post(`/jobs/${id}/action`, { action }),
    },
    queues: {
        list: () => api.get('/queues'),
    },
};
