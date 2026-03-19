from main import report_incident, get_active_incidents
from models.schemas import IncidentCreate

print("Starting test...")
incident = IncidentCreate(
    type="Medical Emergency",
    location="Downtown Square",
    severity=8,
    people_affected=2,
    urgency=5
)
try:
    res = report_incident(incident=incident, user={"uid": "dev"})
    print("REPORT RESULT:", res)
except Exception as e:
    print("REPORT ERROR:", e)

try:
    active = get_active_incidents(user={})
    print("ACTIVE:", active)
except Exception as e:
    print("ACTIVE ERROR:", e)
