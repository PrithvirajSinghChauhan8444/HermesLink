import './SettingsSection.css';

export default function SettingsSection() {
    return (
        <div className="settings-container">
            <h2 className="settings-title">Configuration</h2>

            <div className="settings-grid">
                {['General', 'Network', 'Engines', 'Storage'].map((item) => (
                    <div key={item} className="settings-card group">
                        <h3 className="card-title">{item}</h3>
                        <p className="card-desc">Manage {item.toLowerCase()} settings</p>
                    </div>
                ))}
            </div>

            <div className="footer-info">
                HERMESLINK SYSTEM v1.0.0 • BUILD 2026.02
            </div>
        </div>
    );
}
