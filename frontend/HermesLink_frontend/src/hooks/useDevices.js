import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../config/firebase';

const LS_KEY = 'hl_devices';

function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/**
 * Real-time hook that listens to the RTDB `presence/` node and
 * returns an array of device objects with online/offline status.
 */
export function useDevices() {
    const [devices, setDevices] = useState(() => lsGet(LS_KEY) || []);
    const [loading, setLoading] = useState(() => !lsGet(LS_KEY));

    useEffect(() => {
        const presenceRef = ref(rtdb, 'presence');

        const unsubscribe = onValue(presenceRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                setDevices([]);
                setLoading(false);
                lsSet(LS_KEY, []);
                return;
            }

            const deviceList = Object.entries(data).map(([device_id, info]) => ({
                device_id,
                name: info.name || device_id,
                platform: info.platform || 'unknown',
                status: info.status || 'offline',
                last_seen: info.last_seen || null,
                storage_profiles: info.storage_profiles || {},
            }));

            setDevices(deviceList);
            setLoading(false);
            lsSet(LS_KEY, deviceList);
        });

        // Cleanup: detach listener on unmount
        return () => off(presenceRef, 'value', unsubscribe);
    }, []);

    return { devices, loading };
}

export default useDevices;
