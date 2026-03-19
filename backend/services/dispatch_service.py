from models.schemas import DispatchDecision, IncidentCreate

class DispatchService:
    @staticmethod
    def execute_dispatch(incident: IncidentCreate, decision: DispatchDecision) -> dict:
        additional_resources = []
        incident_lower = incident.type.lower()
        
        # Mutual dispatch evaluation
        if "fire" in incident_lower and incident.severity >= 7:
            additional_resources.append("AMB-01") # auto dispatch medical logic
            
        if "accident" in incident_lower and incident.severity >= 8:
            additional_resources.append("FIRE-01") # send fire to heavy accidents
            
        status = "dispatched" if decision.decision_score > 5.0 else "pending_manual_review"
        
        return {
            "status": status,
            "primary_resource": decision.selected_resource,
            "additional_resources": additional_resources,
            "eta": decision.eta_minutes
        }
