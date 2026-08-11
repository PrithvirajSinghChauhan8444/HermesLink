import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './components/auth/Login';
import DemoWelcome from './components/auth/DemoWelcome';
import { isFirebaseConfigured } from './config/firebase';
import './App.css';

function App() {
    const { currentUser } = useAuth();

    // Determine if we default to demo mode (either firebase is not configured, or user manually enabled it)
    const isDemo = !isFirebaseConfigured || localStorage.getItem('hl_demo_mode') === 'true';

    // Track session-specific proceed state to avoid showing the welcome screen repeatedly in the same session
    const [hasProceeded, setHasProceeded] = useState(() => {
        return sessionStorage.getItem('hl_demo_proceeded') === 'true';
    });

    const handleProceed = () => {
        localStorage.setItem('hl_demo_mode', 'true');
        sessionStorage.setItem('hl_demo_proceeded', 'true');
        setHasProceeded(true);
    };

    if (isDemo) {
        if (!hasProceeded) {
            return <DemoWelcome onProceed={handleProceed} />;
        }
        return (
            <div className="app-container">
                <MainLayout />
            </div>
        );
    }

    return (
        <div className="app-container">
            {currentUser ? <MainLayout /> : <Login />}
        </div>
    );
}

export default App;

