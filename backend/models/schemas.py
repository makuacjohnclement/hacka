from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class IncidentCreate(BaseModel):
    type: str = Field(..., description="Type of incident e.g., fire, medical, police")
    location: str = Field(..., description="Location string or coordinates")
    severity: int = Field(..., ge=1, le=10, description="Severity 1-10")
    people_affected: int = Field(..., ge=0, description="Estimated number of people affected")
    urgency: int = Field(..., ge=1, le=10, description="Urgency level 1-10")

class DispatchDecision(BaseModel):
    selected_resource: str
    decision_score: float
    reason: str
    confidence: float
    eta_minutes: int

class Resource(BaseModel):
    id: str
    type: str  # e.g., ambulance, fire_truck, police_car
    location: str
    available: bool

class Coordinates(BaseModel):
    lat: float
    lng: float

class IncidentRecord(BaseModel):
    id: str
    timestamp: datetime
    incident_data: IncidentCreate
    decision: DispatchDecision
    resolved: bool
    incident_coords: Optional[Coordinates] = None
    unit_coords: Optional[Coordinates] = None
