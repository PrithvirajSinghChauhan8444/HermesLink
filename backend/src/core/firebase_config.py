# src/core/firebase_config.py
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth

def initialize_firebase():
    """
    Initializes the Firebase Admin SDK.
    """
    if not firebase_admin._apps:
        # Load from GOOGLE_APPLICATION_CREDENTIALS if set, or check current env.
        # Ensure your backend .env or system environment has the necessary creds.
        try:
            cred = credentials.Certificate(os.getenv("FIREBASE_PRIVATE_KEY_PATH", "serviceAccountKey.json"))
            firebase_admin.initialize_app(cred)
        except Exception as e:
            # Fallback for environments with google cloud default credentials
            print(f"[Firebase] Could not load explicit service account key, trying default app credentials. Error: {e}")
            firebase_admin.initialize_app()
    
    print("[Firebase] Admin SDK Initialized.")

def get_db():
    """Returns the Firestore database client."""
    return firestore.client()

def get_auth():
    """Returns the Firebase Auth client."""
    return auth

