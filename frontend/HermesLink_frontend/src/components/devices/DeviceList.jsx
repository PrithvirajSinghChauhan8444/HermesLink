import { useDevices } from '../../hooks/useDevices';
import './DeviceList.css';

const PlatformIcon = ({ platform }) => {
    if (platform === 'linux') return <span className="platform-icon">🐧</span>;
    if (platform === 'windows') return <span className="platform-icon">🪟</span>;
    if (platform === 'darwin') return <span className="platform-icon">🍎</span>;
    return <span className="platform-icon">💻</span>;
};

export default function DeviceList({ selectedDeviceId, onSelect }) {
    const { devices, loading } = useDevices();

    if (loading) {
        return <div className="device-list-loading">Loading devices...</div>;
    }

    if (devices.length === 0) {
        return (
            <div className="device-list-empty">
                <span>No devices registered</span>
                <span className="device-list-empty-hint">Start the HermesLink agent on a device</span>
            </div>
        );
    }

    return (
        <div className="device-list">
            {devices.map((device) => {
                const isOnline = device.status === 'online';
                const isSelected = selectedDeviceId === device.device_id;

                return (
                    <button
                        key={device.device_id}
                        className={`device-card ${isSelected ? 'device-card--selected' : ''} ${!isOnline ? 'device-card--offline' : ''}`}
                        onClick={() => isOnline && onSelect(device)}
                        disabled={!isOnline}
                        title={isOnline ? `Select ${device.name}` : `${device.name} is offline`}
                    >
                        <div className="device-card-left">
                            <span className={`device-status-dot ${isOnline ? 'dot--online' : 'dot--offline'}`} />
                            <PlatformIcon platform={device.platform} />
                            <div className="device-info">
                                <span className="device-name">{device.name}</span>
                                <span className="device-id">{device.device_id}</span>
                            </div>
                        </div>
                        <span className={`device-status-label ${isOnline ? 'label--online' : 'label--offline'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
