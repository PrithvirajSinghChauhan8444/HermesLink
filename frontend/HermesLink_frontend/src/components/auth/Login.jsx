import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css'; // We'll create a sleek CSS file for this
import logoSvg from '../../assets/her2 (2)/Layer 4.svg'; // Reuse a nice logo SVG

export default function Login() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup, isSignupAllowed } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLoginView) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
        } catch (err) {
            console.error("Auth error:", err);
            if (err.code === 'auth/admin-restricted-operation') {
                setError('Sign-ups have been disabled by the administrator on this project.');
            } else {
                setError(err.message || 'Failed to authenticate');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={logoSvg} alt="HermesLink Logo" className="login-logo" />
                    <h2>{isLoginView ? 'Welcome Back' : 'Create Admin Account'}</h2>
                    <p>HermesLink Download Manager</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <button disabled={loading} type="submit" className="login-submit-btn">
                        {loading ? 'Authenticating...' : (isLoginView ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <div className="login-footer">
                    {isSignupAllowed && (
                        <button
                            type="button"
                            className="toggle-view-btn"
                            onClick={() => setIsLoginView(!isLoginView)}
                        >
                            {isLoginView ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
                        </button>
                    )}

                    <div className="demo-separator">
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className="demo-mode-btn"
                        onClick={() => {
                            localStorage.setItem('hl_demo_mode', 'true');
                            window.location.reload();
                        }}
                    >
                        Explore Interactive Demo
                    </button>
                </div>
            </div>
        </div>
    );
}
