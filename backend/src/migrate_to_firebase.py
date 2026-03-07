import json
import os
import sys

# Ensure src is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from core.firebase_config import initialize_firebase, get_db
from firebase_admin import firestore

def migrate():
    # Attempt to load old jobs.json
    jobs_file = os.path.join(current_dir, "jobs.json")
    
    if not os.path.exists(jobs_file):
        print("jobs.json not found locally! Ensure it exists at ", jobs_file)
        return

    with open(jobs_file, "r") as f:
        data = json.load(f)

    # Convert complex local formats to Firestore format
    firestore_data = data.copy()
    firestore_data["updated_at"] = firestore.SERVER_TIMESTAMP

    print("Initializing Firebase...")
    try:
        initialize_firebase()
    except Exception as e:
        print(f"Skipping init due to: {e} - assuming already initialized or using default creds")

    from firebase_admin import firestore as admin_firestore
    db = admin_firestore.client()
    
    print("Pushing data to Firestore (app_state/admin_data)...")
    admin_doc_ref = db.collection('app_state').document('admin_data')
    admin_doc_ref.set(firestore_data)
    
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
