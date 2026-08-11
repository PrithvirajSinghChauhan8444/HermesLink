import { api } from './api';

export const fetchFilename = async (url) => {
    const response = await api.get('/resolve-filename', { params: { url } });
    return response.data;
};

export const fetchYtDlpFormats = async (url) => {
    const response = await api.get('/yt-dlp/info', { params: { url } });
    return response.data;
};
