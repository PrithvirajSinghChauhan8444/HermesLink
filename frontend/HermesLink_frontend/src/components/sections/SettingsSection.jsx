import gearSvg from '../../assets/her1/Layer 5.svg';
import arrowEnclosedSvg from '../../assets/her1/Layer 4.svg';
import fastGearSvg from '../../assets/her2 (2)/Layer 6.svg';
import portalArrowSvg from '../../assets/her2 (2)/Layer 5.svg';

import './SettingsSection.css';

export default function SettingsSection() {
    return (
        <div className="settings-container">
            {/* Background Decor */}
            <div className="floating-decor-container">
                <img src={gearSvg} alt="Gear Decor" className="floating-svg floating-svg-settings floating-svg-light settings-svg-1" />
                <img src={arrowEnclosedSvg} alt="Arrow Enclosed Decor" className="floating-svg floating-svg-settings floating-svg-light settings-svg-2" />
                <img src={fastGearSvg} alt="Fast Gear Decor" className="floating-svg floating-svg-settings floating-svg-light settings-svg-3" />
                <img src={portalArrowSvg} alt="Portal Arrow Decor" className="floating-svg floating-svg-settings floating-svg-light settings-svg-4" />
            </div>

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
