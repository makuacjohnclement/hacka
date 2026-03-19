import json
import os
from dotenv import load_dotenv
load_dotenv()

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    firebase_admin = None

WEIGHTS_FILE = "weights.json"

class LearningEngine:
    def __init__(self):
        self.db = self._init_firestore()
        self._in_memory_incidents = self._load_fallback_cases()  # Fallback if Firestore unavailable
        self._ensure_weights()
        self.weights = self.load_weights()
        
    def _load_fallback_cases(self):
        cases_file = "cases_db.json"
        if os.path.exists(cases_file):
            try:
                with open(cases_file, "r") as f:
                    cases_list = json.load(f)
                    return {c['id']: c for c in cases_list}
            except Exception as e:
                print("Failed to load cases_db.json:", e)
        return {}

    def _save_fallback_cases(self):
        try:
            with open("cases_db.json", "w") as f:
                json.dump(list(self._in_memory_incidents.values()), f, indent=4)
        except Exception as e:
            print("Failed to save cases_db.json:", e)
        
    def _init_firestore(self):
        if not firebase_admin._apps:
            try:
                # Expects Key file in backend/
                cred = credentials.Certificate("serviceAccountKey.json")
                firebase_admin.initialize_app(cred)
                print("[OK] Firestore successfully initialized")
                return firestore.client()
            except Exception as e:
                print("[WARN] Firestore init failed. Ensure 'serviceAccountKey.json' is present in the backend folder.")
                print("Error Details:", e)
                return None
        return firestore.client()

    def _ensure_weights(self):
        if not os.path.exists(WEIGHTS_FILE):
            default_weights = {
                "severity_weight": 1.5,
                "urgency_weight": 2.0,
                "people_weight": 1.0,
                "distance_penalty": 0.5
            }
            with open(WEIGHTS_FILE, "w") as f:
                json.dump(default_weights, f)
                
    def load_weights(self):
        with open(WEIGHTS_FILE, "r") as f:
            return json.load(f)

    def save_case(self, incident_record: dict):
        if self.db:
            try:
                self.db.collection('incidents').document(incident_record['id']).set(incident_record)
                self._check_and_update_weights()
                return
            except Exception as e:
                print("Firestore save_case error:", e)
        # Fallback to in-memory
        self._in_memory_incidents[incident_record['id']] = incident_record
        self._save_fallback_cases()
        self._check_and_update_weights()

    def resolve_case(self, incident_id: str, resolved_at=None, response_time_seconds=None):
        update_fields = {'resolved': True}
        if resolved_at is not None:
            update_fields['resolved_at'] = resolved_at
        if response_time_seconds is not None:
            update_fields['response_time_seconds'] = response_time_seconds

        if self.db:
            try:
                self.db.collection('incidents').document(incident_id).update(update_fields)
                self._check_and_update_weights()
                return
            except Exception as e:
                print("Firestore resolve_case error:", e)

        # Fallback to in-memory
        if incident_id in self._in_memory_incidents:
            self._in_memory_incidents[incident_id]['resolved'] = True
            if resolved_at is not None:
                # cases_db.json is JSON, so store as ISO string
                self._in_memory_incidents[incident_id]['resolved_at'] = (
                    resolved_at.isoformat() if hasattr(resolved_at, 'isoformat') else str(resolved_at)
                )
            if response_time_seconds is not None:
                self._in_memory_incidents[incident_id]['response_time_seconds'] = float(response_time_seconds)
            self._save_fallback_cases()
            self._check_and_update_weights()

    def get_all_cases(self):
        if self.db:
            try:
                docs = self.db.collection('incidents').get()
                return [doc.to_dict() for doc in docs]
            except Exception as e:
                print("Firestore get_all_cases error:", e)
        # Fallback to in-memory
        return list(self._in_memory_incidents.values())

    def _check_and_update_weights(self):
        if not self.db: return
        try:
            # Rebalance weights every 5 fully resolved fires/accidents
            resolved_docs = self.db.collection('incidents').where('resolved', '==', True).get()
            
            if len(resolved_docs) > 0 and len(resolved_docs) % 5 == 0:
                print("Learning Engine: Updating weights based on resolved cases...")
                self.weights["severity_weight"] += 0.05
                self.weights["distance_penalty"] -= 0.02
                
                with open(WEIGHTS_FILE, "w") as f:
                    json.dump(self.weights, f, indent=4)
        except Exception as e:
            print("Failed to update weights:", e)
