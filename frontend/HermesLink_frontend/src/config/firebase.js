import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0000000000",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://dummy-project-default-rtdb.firebaseio.com",
};

export const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Initialize Analytics conditionally (it requires a browser environment)
export let analytics = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export default app;
