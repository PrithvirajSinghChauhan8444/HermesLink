import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const endpoints = {
    jobs: {
        list: () => api.get('/jobs'),
        active: () => api.get('/jobs/active'),
        history: () => api.get('/jobs/history'),
        get: (id) => api.get(`/jobs/${id}`),
        create: (data) => api.post('/jobs', data),
    },
    queues: {
        list: () => api.get('/queues'),
    },
};
