import sys
class MockFirebase:
    _apps = {}
    def initialize_app(self, *args, **kwargs): pass
class MockFirestore:
    def client(self): return None
class MockCreds:
    def Certificate(self, *args, **kwargs): pass
class MockAdmin:
    _apps = {}
    def initialize_app(self, *args, **kwargs): pass
    credentials = MockCreds()
    firestore = MockFirestore()

sys.modules['firebase_admin'] = MockAdmin()
sys.modules['firebase_admin.credentials'] = MockCreds()
sys.modules['firebase_admin.firestore'] = MockFirestore()
sys.modules['firebase_admin.auth'] = type('MockAuth', (), {})()

from main import report_incident, get_active_incidents, decision_engine, resolve_incident
from models.schemas import IncidentCreate

print("Starting verification test...")
incident = IncidentCreate(
    type="Medical Emergency",
    location="Downtown Square",
    severity=8,
    people_affected=2,
    urgency=5
)

amb01 = next(r for r in decision_engine.available_resources if r.id == "AMB-01")
print("AMB-01 initially available:", amb01.available)

# Report incident
res = report_incident(incident=incident, user={"uid": "dev"})
print("REPORT RESULT:", res)

print("AMB-01 after dispatch available:", amb01.available)

active = get_active_incidents(user={})
print("ACTIVE INCIDENTS:", [c['id'] for c in active])

# Resolve incident
resolve_res = resolve_incident(res["incident_id"], {"uid": "dev"})
print("RESOLVE RESULT:", resolve_res)

print("AMB-01 after resolve available:", amb01.available)

import json
try:
    with open("cases_db.json", "r") as f:
        cases = json.load(f)
        print("SAVED IN CASES_DB.JSON:", len(cases), "cases")
except Exception as e:
    print("ERROR READING CASES_DB:", e)

