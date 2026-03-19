from dotenv import load_dotenv
load_dotenv()  # Load .env variables before anything else

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from fastapi import Query
from models.schemas import IncidentCreate, DispatchDecision, IncidentRecord
from services.decision_engine import DecisionEngine
from services.dispatch_service import DispatchService
from services.learning_engine import LearningEngine
import uuid
from datetime import datetime
import os
from reportlab.pdfgen import canvas
import pandas as pd
from auth import init_firebase, get_current_user
from fastapi import Depends
import re

app = FastAPI(title="SmartAid Emergency Response API")

# Setup CORS for Frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

learning_engine = LearningEngine()
decision_engine = DecisionEngine(learning_engine=learning_engine)
dispatch_service = DispatchService()

@app.on_event("startup")
def startup_event():
    init_firebase()

@app.get("/")
def check_health():
    return {"status": "SmartAid Backend is Running smoothly with Firestore"}

@app.post("/incident")
def report_incident(incident: IncidentCreate, user: dict = Depends(get_current_user)):
    # 1. AI Decision evaluates the incident context
    decision = decision_engine.evaluate_incident(incident)
    
    # 2. Setup Dispatch 
    dispatch_result = dispatch_service.execute_dispatch(incident, decision)
    
    # Geocode locations for the frontend map
    incident_coords = decision_engine.map_service.geocode(incident.location)
    selected_unit = next((r for r in decision_engine.available_resources if r.id == decision.selected_resource), None)
    unit_coords = decision_engine.map_service.geocode(selected_unit.location) if selected_unit else incident_coords

    if selected_unit and dispatch_result.get("status") == "dispatched":
        selected_unit.available = False

    # 3. Create active tracker
    record_id = str(uuid.uuid4())
    record = IncidentRecord(
        id=record_id,
        timestamp=datetime.now(),
        incident_data=incident,
        decision=decision,
        resolved=False,
        incident_coords=incident_coords,
        unit_coords=unit_coords
    )
    
    record_dict = jsonable_encoder(record)
    record_dict["reporter_uid"] = user.get("uid", "unknown")  # tag the case with who reported it
    record_dict["status"] = "dispatched"  # dispatcher-submitted: immediately dispatched
    
    # Save case to DB for continuous learning and active tracking
    learning_engine.save_case(record_dict)
    
    return {
        "incident_id": record_id,
        "ai_decision": decision,
        "dispatch_status": dispatch_result
    }


@app.post("/incident/citizen")
def citizen_report_incident(incident: IncidentCreate, user: dict = Depends(get_current_user)):
    """Citizen-submitted report: saved as pending, awaiting dispatcher approval."""
    try:
        # Pre-compute AI suggestion (for display) but do NOT mark any unit as unavailable yet.
        decision = decision_engine.evaluate_incident(incident)
        incident_coords = decision_engine.map_service.geocode(incident.location)

        record_id = str(uuid.uuid4())
        record = IncidentRecord(
            id=record_id,
            timestamp=datetime.now(),
            incident_data=incident,
            decision=decision,
            resolved=False,
            incident_coords=incident_coords,
            unit_coords=None,   # no unit dispatched yet
        )

        record_dict = jsonable_encoder(record)
        record_dict["reporter_uid"] = user.get("uid", "unknown")
        record_dict["status"] = "pending"  # waiting for dispatcher approval
        learning_engine.save_case(record_dict)

        return {
            "incident_id": record_id,
            "ai_suggestion": jsonable_encoder(decision),
            "status": "pending"
        }
    except Exception as e:
        import traceback
        print("[ERROR] /incident/citizen failed:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to process citizen report: {str(e)}")


@app.post("/incident/{incident_id}/dispatch")
def dispatcher_dispatch_incident(incident_id: str, user: dict = Depends(get_current_user)):
    """Dispatcher approves and dispatches a pending incident."""
    cases = learning_engine.get_all_cases()
    case = next((c for c in cases if c["id"] == incident_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if case.get("status") == "dispatched":
        raise HTTPException(status_code=400, detail="Incident already dispatched.")

    # Re-run decision engine properly (marks unit unavailable)
    from models.schemas import IncidentCreate as IC
    inc_data = case["incident_data"]
    incident = IC(**inc_data)
    decision = decision_engine.evaluate_incident(incident)
    dispatch_result = dispatch_service.execute_dispatch(incident, decision)

    selected_unit = next(
        (r for r in decision_engine.available_resources if r.id == decision.selected_resource), None
    )
    unit_coords = decision_engine.map_service.geocode(selected_unit.location) if selected_unit else case.get("incident_coords")
    if selected_unit and dispatch_result.get("status") == "dispatched":
        selected_unit.available = False

    # Update the stored record
    update = {
        "status": "dispatched",
        "decision": jsonable_encoder(decision),
        "unit_coords": jsonable_encoder(unit_coords),
    }
    if learning_engine.db:
        try:
            learning_engine.db.collection("incidents").document(incident_id).update(update)
        except Exception as e:
            print("Firestore update error:", e)
            case.update(update)
            learning_engine._in_memory_incidents[incident_id] = case
            learning_engine._save_fallback_cases()
    else:
        case.update(update)
        learning_engine._in_memory_incidents[incident_id] = case
        learning_engine._save_fallback_cases()

    return {
        "incident_id": incident_id,
        "ai_decision": decision,
        "dispatch_status": dispatch_result
    }

@app.post("/incident/{incident_id}/resolve")
def resolve_incident(incident_id: str, user: dict = Depends(get_current_user)):
    cases = learning_engine.get_all_cases()
    incident = next((c for c in cases if c['id'] == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found in Firestore.")
        
    if "decision" in incident and "selected_resource" in incident["decision"]:
        res_id = incident["decision"]["selected_resource"]
        unit = next((r for r in decision_engine.available_resources if r.id == res_id), None)
        if unit:
            unit.available = True
            
    # Re-save resolution to the DB + store response time analytics
    resolved_at = datetime.now()

    def parse_timestamp(ts):
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts)
            except Exception:
                return None
        return None

    start_ts = parse_timestamp(incident.get("timestamp"))
    response_time_seconds = None
    if start_ts:
        response_time_seconds = (resolved_at - start_ts).total_seconds()

    learning_engine.resolve_case(
        incident_id,
        resolved_at=resolved_at,
        response_time_seconds=response_time_seconds,
    )

    return {
        "status": "Incident resolved and learning engine notified.",
        "resolved_at": resolved_at.isoformat(),
        "response_time_seconds": response_time_seconds,
    }

@app.get("/pending_incidents")
def get_pending_incidents(user: dict = Depends(get_current_user)):
    """Return all citizen-submitted pending (not-yet-dispatched) incidents."""
    cases = learning_engine.get_all_cases()
    return [c for c in cases if c.get("status") == "pending" and not c.get("resolved")]


@app.get("/my_incidents")
def get_my_incidents(user: dict = Depends(get_current_user)):
    """Return all incidents reported by the currently logged-in user."""
    uid = user.get("uid", "")
    cases = learning_engine.get_all_cases()
    return [c for c in cases if c.get("reporter_uid") == uid]

@app.get("/active_incidents")
def get_active_incidents(user: dict = Depends(get_current_user)):
    cases = learning_engine.get_all_cases()
    # Only return dispatched (not pending) unresolved incidents for the map
    return [
        c for c in cases
        if not c.get('resolved') and c.get('status', 'dispatched') == 'dispatched'
    ]

@app.get("/stats/top_areas")
def top_incident_areas(limit: int = Query(5, ge=1, le=50), user: dict = Depends(get_current_user)):
    cases = learning_engine.get_all_cases()
    counts = {}

    def normalize_area(raw: str) -> str:
        s = (raw or "").strip().lower()
        if not s:
            return ""

        # Remove common suffixes/phrases
        for token in [" kenya", ", kenya", " nairobi", ", nairobi", " - nairobi", " (nairobi)"]:
            s = s.replace(token, "")

        s = re.sub(r"[^a-z0-9\s]", " ", s)
        s = re.sub(r"\s+", " ", s).strip()

        # Canonicalize aliases -> neighborhood keys
        aliases = {
            "cbd": "nairobi cbd",
            "nairobi cbd": "nairobi cbd",
            "central business district": "nairobi cbd",
            "jkia": "jkia",
            "jomo kenyatta international airport": "jkia",
            "industrial area": "industrial area",
            "south b": "south b",
            "south c": "south c",
            "ngong road": "ngong road",
            "mombasa road": "mombasa road",
        }

        # Backwards compat for earlier demo strings
        demo_aliases = {
            "downtown square": "nairobi cbd",
            "north district": "roysambu",
            "east district": "eastleigh",
        }

        if s in demo_aliases:
            s = demo_aliases[s]

        # If string contains a known neighborhood name, prefer that.
        neighborhoods = [
            "upper hill",
            "westlands",
            "parklands",
            "kilimani",
            "lavington",
            "karen",
            "langata",
            "eastleigh",
            "embakasi",
            "donholm",
            "kawangware",
            "roysambu",
            "githurai",
            "kasarani",
            "ruiru",
            "juja",
            "industrial area",
            "south b",
            "south c",
            "ngong road",
            "mombasa road",
            "jkia",
            "nairobi cbd",
        ]
        for n in neighborhoods:
            if n in s:
                return n

        return aliases.get(s, s)

    def display_name(norm: str) -> str:
        if not norm:
            return ""
        if norm == "jkia":
            return "JKIA"
        if norm == "nairobi cbd":
            return "Nairobi CBD"
        return " ".join([w.capitalize() for w in norm.split(" ")])

    for c in cases:
        inc = (c or {}).get("incident_data") or {}
        loc = (inc.get("location") or "").strip()
        if not loc:
            continue
        key = normalize_area(loc)
        if not key:
            continue
        counts[key] = counts.get(key, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return [{"area": display_name(area), "incidents": n} for area, n in ranked]

@app.get("/reports/pdf")
def generate_pdf_report():
    file_path = "smartaid_report.pdf"
    
    c = canvas.Canvas(file_path)
    c.drawString(100, 800, "SmartAid Emergency System - Incident Report (Firestore)")
    
    cases = learning_engine.get_all_cases()
        
    y = 750
    for case in cases[-15:]:
        ts = case['timestamp'][:16]
        text = f"[{ts}] {case['incident_data']['type']} -> {case['decision']['selected_resource']} (Res: {case['resolved']})"
        c.drawString(50, y, text)
        y -= 25
        if y < 50:
            c.showPage()
            y = 800
            
    c.save()
    return FileResponse(file_path, filename="SmartAid_Report.pdf", media_type="application/pdf")

@app.get("/reports/excel")
def generate_excel_report():
    file_path = "smartaid_report.xlsx"
    
    cases = learning_engine.get_all_cases()
        
    if not cases:
        df = pd.DataFrame(columns=["ID", "Timestamp", "Type", "Severity", "Resource", "Resolved", "Resolved At", "Response Time (s)"])
    else:
        flat_cases = []
        for c in cases:
            flat_cases.append({
                "ID": c["id"],
                "Timestamp": c["timestamp"],
                "Type": c["incident_data"]["type"],
                "Location": c["incident_data"]["location"],
                "Severity": c["incident_data"]["severity"],
                "Dispatched Resource": c["decision"]["selected_resource"],
                "Decision Score": c.get("decision", {}).get("decision_score", 0),
                "Resolved": c["resolved"],
                "Resolved At": c.get("resolved_at"),
                "Response Time (s)": c.get("response_time_seconds"),
            })
        df = pd.DataFrame(flat_cases)
        
    df.to_excel(file_path, index=False)
    return FileResponse(file_path, filename="SmartAid_Report.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.get("/stats/avg_response_time_minutes")
def avg_response_time_minutes(user: dict = Depends(get_current_user)):
    cases = learning_engine.get_all_cases()
    times = []
    for c in cases:
        if c and c.get("resolved"):
            t = c.get("response_time_seconds")
            try:
                if t is not None:
                    times.append(float(t))
            except Exception:
                pass
    if not times:
        return {"avg_response_time_minutes": None, "avg_response_time_seconds": None, "sample_size": 0}
    avg_seconds = sum(times) / len(times)
    return {
        "avg_response_time_minutes": round(avg_seconds / 60.0, 2),
        "avg_response_time_seconds": round(avg_seconds, 2),
        "sample_size": len(times),
    }
