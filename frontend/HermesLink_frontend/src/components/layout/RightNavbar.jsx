import React from 'react';

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
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-4 items-end">
            {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                    <button
                        key={section.id}
                        onClick={() => onNavigate(section.id)}
                        className={`transition-all duration-300 ease-out text-right ${isDarkSection
                            ? (isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200')
                            : (isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600')
                            } ${isActive ? 'font-bold text-2xl opacity-100 scale-110' : 'font-medium text-sm opacity-60'}`}
                    >
                        {section.label}
                    </button>
                );
            })}
        </div>
    );
}
