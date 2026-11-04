import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const isDemo = !isFirebaseConfigured || localStorage.getItem('hl_demo_mode') === 'true';
    const isSignupAllowed = import.meta.env.VITE_ALLOW_SIGNUP !== 'false';

    function login(email, password) {
        if (isDemo) {
            return Promise.resolve();
        }
        return signInWithEmailAndPassword(auth, email, password);
    }

    function signup(email, password) {
        if (isDemo) {
            return Promise.resolve();
        }
        if (!isSignupAllowed) {
            return Promise.reject(new Error("Public sign-ups are disabled on this instance. Please contact the administrator."));
        }
        return createUserWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        if (isDemo) {
            localStorage.removeItem('hl_demo_mode');
            sessionStorage.removeItem('hl_demo_proceeded');
            setCurrentUser(null);
            window.location.reload();
            return Promise.resolve();
        }
        return signOut(auth);
    }

    useEffect(() => {
        if (isDemo) {
            setCurrentUser({
                email: 'demo@hermeslink.io',
                displayName: 'Demo Admin',
                uid: 'demo-user-123'
            });
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, [isDemo]);

    const value = {
        currentUser,
        login,
        signup,
        logout,
        isSignupAllowed
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
