import React from 'react';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './components/auth/Login';
import './App.css';

function App() {
    const { currentUser } = useAuth();

    return (
        <div className="app-container">
            {currentUser ? <MainLayout /> : <Login />}
        </div>
    );
}

export default App;

