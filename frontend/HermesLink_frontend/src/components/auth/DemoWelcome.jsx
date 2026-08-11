import React from 'react';
import './DemoWelcome.css';
import logoSvg from '../../assets/her2 (2)/Layer 4.svg';

export default function DemoWelcome({ onProceed }) {
    return (
        <div className="demo-welcome-container">
            <div className="welcome-glow orb-1"></div>
            <div className="welcome-glow orb-2"></div>
            
            <div className="welcome-card">
                <div className="welcome-header">
                    <img src={logoSvg} alt="HermesLink Logo" className="welcome-logo" />
                    <h1>HermesLink</h1>
                    <div className="badge-demo">PREVIEW DEMO</div>
                    <p className="welcome-tagline">Distributed, Real-Time Remote Download Coordinator</p>
                </div>

                <div className="disclaimer-box">
                    <svg className="warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <div className="disclaimer-text">
                        <strong>Preview Mode Active</strong>
                        <p>This is a self-contained layout demonstration. It does not connect to any file systems, no APIs are called, and it does not initialize or execute downloads on any actual devices.</p>
                    </div>
                </div>

                <div className="welcome-features">
                    <h3>Simulated Capabilities</h3>
                    <div className="features-grid">
                        <div className="feature-item">
                            <span className="feature-dot">⚡</span>
                            <div>
                                <strong>Active Operations</strong>
                                <p>Watch simulated downloads progress in real-time, complete, and dynamically move to history.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-dot">📅</span>
                            <div>
                                <strong>Priority Scheduling</strong>
                                <p>Submit URLs to experience how task scheduling works according to queue configurations.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-dot">🎛️</span>
                            <div>
                                <strong>Interactive Controls</strong>
                                <p>Click Play, Pause, or Stop on downloads to see state updates immediately.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="welcome-actions">
                    <button onClick={onProceed} className="proceed-btn">
                        Proceed to Demo Dashboard
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
