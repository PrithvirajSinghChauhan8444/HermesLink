export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(speedStr) {
    if (!speedStr) return '0 B/s';
    // speedStr usually comes as "1.2 MB/s" from backend, but if raw bytes/s:
    // ... logic if needed, but backend seems to send formatted string.
    return speedStr;
}
