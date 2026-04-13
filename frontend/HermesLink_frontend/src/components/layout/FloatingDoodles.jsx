import { useEffect, useState } from 'react';
import './FloatingDoodles.css';

import cloudSvg from '../../assets/her1/Layer 1.svg';
import docArrowSvg from '../../assets/her1/Layer 3.svg';
import gearSvg from '../../assets/her1/Layer 5.svg';
import monitorSvg from '../../assets/her1/Layer 2.svg';
import arrowEnclosedSvg from '../../assets/her1/Layer 4.svg';

import browserSvg from '../../assets/her2 (2)/Layer 1.svg';
import cloudFolderSvg from '../../assets/her2 (2)/Layer 2.svg';
import portalSvg from '../../assets/her2 (2)/Layer 5.svg';
import batchDocSvg from '../../assets/her2 (2)/Layer 4.svg';
import progressArrowSvg from '../../assets/her2 (2)/Layer 3.svg';
import fastGearSvg from '../../assets/her2 (2)/Layer 6.svg';

const doodles = [
    // Larger Doodles
    { src: cloudSvg, size: 240, delay: 0 },
    { src: cloudFolderSvg, size: 210, delay: 5.5 },
    { src: browserSvg, size: 190, delay: 1.2 },

    // Medium Doodles
    { src: monitorSvg, size: 140, delay: 2.1 },
    { src: gearSvg, size: 130, delay: 3.1 },
    { src: docArrowSvg, size: 120, delay: 4.8 },
    { src: fastGearSvg, size: 125, delay: 1.8 },

    // Smaller Doodles
    { src: portalSvg, size: 80, delay: 2.4 },
    { src: batchDocSvg, size: 85, delay: 2.7 },
    { src: arrowEnclosedSvg, size: 90, delay: 3.5 },
    { src: progressArrowSvg, size: 175, delay: 4.2 }
];

// Fixed scattered radiuses for the 11 wheel positions
// Changing to fixed random positions (x, y) coordinates mapped from center
// Using percentages -50% to 50% relative to center
// Added a slight random rotation offset (-20 to 20 degrees) so they don't look perfectly upright
const fixedPositions = [
    { x: -35, y: -40, baseRotation: -15 },
    { x: 42, y: -30, baseRotation: 12 },
    { x: -35, y: 5, baseRotation: -8 },
    { x: -30, y: 35, baseRotation: 18 },
    { x: 10, y: -45, baseRotation: -20 },
    { x: -45, y: -10, baseRotation: 20 },
    { x: 40, y: 10, baseRotation: -5 },
    { x: -20, y: 40, baseRotation: 10 },
    { x: -5, y: 30, baseRotation: -12 },
    { x: 25, y: -15, baseRotation: 15 },
    { x: 15, y: 35, baseRotation: -25 }
];

export default function FloatingDoodles({ containerRef, activeSection }) {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const container = containerRef?.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollY = container.scrollTop;
            // Adjust the multiplier to control the ferris wheel rotation speed
            setRotation(scrollY * 0.05);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial position

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [containerRef, activeSection]);

    const isDarkMode = activeSection === 'history' || activeSection === 'settings';

    return (
        <div className={`global-floating-decor-container ${isDarkMode ? 'dark-section' : ''}`}>
            <div className="wheel-container" style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}>
                {doodles.map((doodle, index) => {
                    const pos = fixedPositions[index % fixedPositions.length];
                    return (
                        <div
                            key={index}
                            className="random-doodle-wrapper"
                            style={{
                                left: `calc(50% + ${pos.x}vw)`,
                                top: `calc(50% + ${pos.y}vh)`
                            }}
                        >
                            <div
                                className="float-wrapper"
                                style={{ animationDelay: `${doodle.delay}s` }}
                            >
                                <div
                                    className="car-content"
                                    style={{
                                        // Counter-rotate against the wheel AND apply the fixed individual offset
                                        transform: `rotate(${-rotation + pos.baseRotation}deg)`,
                                        width: `${doodle.size}px`,
                                        height: `${doodle.size}px`,
                                        marginLeft: `-${doodle.size / 2}px`,
                                        marginTop: `-${doodle.size / 2}px`
                                    }}
                                >
                                    <img src={doodle.src} alt="Doodle" className="global-svg" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
