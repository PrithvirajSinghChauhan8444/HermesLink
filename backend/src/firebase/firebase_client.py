import os
import firebase_admin
from firebase_admin import credentials, firestore, auth, db
from google.cloud import firestore as google_firestore
from typing import Any

def initialize_firebase() -> None:
    """
    Initializes the Firebase Admin SDK.
    """
    if not firebase_admin._apps:
        database_url = os.getenv("FIREBASE_DATABASE_URL")
        private_key_path = os.getenv("FIREBASE_PRIVATE_KEY_PATH", "serviceAccountKey.json")
        try:
            cred = credentials.Certificate(private_key_path)
            options = {}
            if database_url:
                options["databaseURL"] = database_url
            firebase_admin.initialize_app(cred, options)
        except Exception as e:
            # Fallback for environments with google cloud default credentials
            print(f"[Firebase] Could not load explicit service account key, trying default app credentials. Error: {e}")
            options = {}
            if database_url:
                options["databaseURL"] = database_url
            firebase_admin.initialize_app(options=options)
    
    print("[Firebase] Admin SDK Initialized.")

def get_firestore_client() -> google_firestore.Client:
    """Returns the Firestore database client."""
    return firestore.client()

def get_auth_client() -> Any:
    """Returns the Firebase Auth client."""
    return auth

def get_realtime_database_reference() -> Any:
    """Returns the Realtime Database root reference."""
    return db.reference()
