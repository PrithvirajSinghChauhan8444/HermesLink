import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../config/firebase';

/**
 * Real-time hook that listens to the RTDB `presence/` node and
 * returns an array of device objects with online/offline status.
 */
export function useDevices() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const presenceRef = ref(rtdb, 'presence');

        const unsubscribe = onValue(presenceRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                setDevices([]);
                setLoading(false);
                return;
            }

            const deviceList = Object.entries(data).map(([device_id, info]) => ({
                device_id,
                name: info.name || device_id,
                platform: info.platform || 'unknown',
                status: info.status || 'offline',
                last_seen: info.last_seen || null,
            }));

            setDevices(deviceList);
            setLoading(false);
        });

        // Cleanup: detach listener on unmount
        return () => off(presenceRef, 'value', unsubscribe);
    }, []);

    return { devices, loading };
}

export default useDevices;
