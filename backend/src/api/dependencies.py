from fastapi import Request, HTTPException
from typing import Any
from firebase import get_auth_client

def get_current_user(request: Request) -> Any:
    """
    Dependency to extract and verify the Firebase ID token from the Authorization header.
    For this application, any valid Firebase token is accepted as the 'admin' user.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    try:
        auth_client = get_auth_client()
        decoded_token = auth_client.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
