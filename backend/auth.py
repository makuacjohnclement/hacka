from fastapi import Header, HTTPException, Depends
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import os

# --- Dev mode flag (set AUTH_REQUIRED=false in .env to bypass auth locally) ---
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").lower() != "false"

def init_firebase():
    """Initialize Firebase Admin SDK. Supports serviceAccountKey.json or GOOGLE_APPLICATION_CREDENTIALS env var."""
    if firebase_admin._apps:
        return  # Already initialized

    try:
        key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            print(f"[OK] Firebase Admin initialized from: {key_path}")
        else:
            # Try Application Default Credentials (works on GCP / Cloud Run)
            firebase_admin.initialize_app()
            print("[OK] Firebase Admin initialized via Application Default Credentials.")
    except Exception as e:
        print(f"[WARN] Firebase Admin init failed: {e}")
        if AUTH_REQUIRED:
            raise RuntimeError(f"Firebase Admin could not be initialized and AUTH_REQUIRED=true. Error: {e}")

def get_current_user(authorization: str = Header(None)):
    """Verify Firebase ID token. If AUTH_REQUIRED=false (dev mode), bypasses check."""
    if not AUTH_REQUIRED:
        return {"uid": "dev-user", "email": "dev@smartaid.local"}

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    token = authorization.split("Bearer ")[1]
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")
