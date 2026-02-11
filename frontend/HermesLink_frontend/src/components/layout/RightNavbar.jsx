import React from 'react';
import './RightNavbar.css';

const sections = [
    { id: 'landing', label: 'Home' },
    { id: 'active-jobs', label: 'Active Jobs' },
    { id: 'queue', label: 'Queue' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
];

export default function RightNavbar({ activeSection, onNavigate }) {
    // History and Settings have dark backgrounds
    const isDarkSection = activeSection === 'history' || activeSection === 'settings';

    return (
        <div className="right-navbar-container">
            {sections.map((section) => {
                const isActive = activeSection === section.id;

                let colorClass = '';
                if (isDarkSection) {
                    colorClass = isActive ? 'theme-dark-active' : 'theme-dark-inactive';
                } else {
                    colorClass = isActive ? 'theme-light-active' : 'theme-light-inactive';
                }

                const stateClass = isActive ? 'nav-item-active' : 'nav-item-inactive';

                return (
                    <button
                        key={section.id}
                        onClick={() => onNavigate(section.id)}
                        className={`nav-item ${colorClass} ${stateClass}`}
                    >
                        {section.label}
                    </button>
                );
            })}
        </div>
    );
}
