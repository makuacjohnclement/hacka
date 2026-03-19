from models.schemas import IncidentCreate, DispatchDecision, Resource
from services.map_service import MapService
from services.learning_engine import LearningEngine
from services.vertex_ai_brain import VertexAIBrain, build_candidate_payload
from typing import Optional


class DecisionEngine:
    def __init__(self, learning_engine=None):
        from services.learning_engine import LearningEngine as LE
        self.learning_engine = learning_engine if learning_engine else LE()
        self.map_service = MapService()
        self.brain = VertexAIBrain()

        # Nairobi emergency resources with real station locations
        self.available_resources: list[Resource] = [
            Resource(id="HELI-01", type="helicopter",  location="Wilson Airport, Nairobi",               available=True),
            Resource(id="HELI-02", type="helicopter",  location="JKIA, Nairobi",                         available=True),
            Resource(id="AMB-01",  type="ambulance",   location="Kenyatta National Hospital, Nairobi",   available=True),
            Resource(id="AMB-02",  type="ambulance",   location="Aga Khan Hospital, Nairobi",            available=True),
            Resource(id="AMB-03",  type="ambulance",   location="Nairobi West Hospital, Langata",        available=True),
            Resource(id="FIRE-01", type="fire_truck",  location="Central Fire Station, Nairobi CBD",     available=True),
            Resource(id="FIRE-02", type="fire_truck",  location="Industrial Area Fire Station, Nairobi", available=True),
            Resource(id="POL-01",  type="police_car",  location="Central Police Station, Nairobi CBD",   available=True),
            Resource(id="POL-02",  type="police_car",  location="Westlands Police Station, Nairobi",     available=True),
            Resource(id="POL-03",  type="police_car",  location="Kasarani Police Station, Nairobi",      available=True),
        ]

    # ── Incident-type → resource-type mapping ─────────────────────────────
    def _target_resource_type(self, incident_type: str) -> Optional[str]:
        t = incident_type.lower()
        if any(k in t for k in ("medical", "injury", "attack", "accident")):
            return "ambulance"
        if any(k in t for k in ("fire", "smoke", "gas", "outbreak")):
            return "fire_truck"
        if any(k in t for k in ("flood", "water", "rescue")):
            return "helicopter"
        if any(k in t for k in ("police", "crime", "theft", "assault", "action")):
            return "police_car"
        return None  # "Other" → pick by lowest ETA from all types

    # ── Main evaluation entry point ───────────────────────────────────────
    def evaluate_incident(self, incident: IncidentCreate) -> DispatchDecision:
        weights = self.learning_engine.load_weights()

        target_type = self._target_resource_type(incident.type)

        # Build candidate pool
        if target_type:
            candidates = [r for r in self.available_resources if r.type == target_type and r.available]
            # Fallback: preferred type all busy → any available unit
            if not candidates:
                print(f"[WARN] No available {target_type} units — falling back to any available resource.")
                candidates = [r for r in self.available_resources if r.available]
        else:
            # "Other" or unrecognised → all available units; scorer picks closest
            candidates = [r for r in self.available_resources if r.available]

        if not candidates:
            return DispatchDecision(
                selected_resource="NONE",
                decision_score=0.0,
                reason="No resources available at this time.",
                confidence=0.0,
                eta_minutes=0,
            )

        # Pre-compute ETAs once to avoid repeated API calls
        candidate_etas: dict[str, int] = {
            r.id: self.map_service.calculate_eta(r.location, incident.location)
            for r in candidates
        }

        # ── Vertex AI brain path ──────────────────────────────────────────
        brain_decision = self.brain.decide(
            incident=incident,
            candidates=build_candidate_payload(candidates, candidate_etas),
        )
        if brain_decision:
            selected_id = str(brain_decision.get("selected_resource", ""))
            selected = next((r for r in candidates if r.id == selected_id), None)
            if selected:
                eta = int(candidate_etas.get(selected.id, 15))
                score = self._score(incident, weights, eta)
                return DispatchDecision(
                    selected_resource=selected.id,
                    decision_score=round(score, 2),
                    reason=str(brain_decision.get("reason", "")),
                    confidence=round(float(brain_decision.get("confidence", 0.0)), 1),
                    eta_minutes=eta,
                )

        # ── Weighted scoring fallback ─────────────────────────────────────
        best_resource: Optional[Resource] = None
        best_score = float("-inf")
        best_eta = 15

        for resource in candidates:
            eta = int(candidate_etas.get(resource.id, 15))
            score = self._score(incident, weights, eta)
            if score > best_score:
                best_score = score
                best_resource = resource
                best_eta = eta

        if best_resource is None:
            return DispatchDecision(
                selected_resource="NONE",
                decision_score=0.0,
                reason="No resources could be scored.",
                confidence=0.0,
                eta_minutes=0,
            )

        # Confidence: sigmoid-style clamp between 55 % and 98 %
        raw_conf = 55.0 + min(43.0, max(0.0, best_score * 0.8))
        confidence = round(raw_conf, 1)

        reason = (
            f"Dispatching {best_resource.id} ({best_resource.type.replace('_', ' ')}) "
            f"— optimal ETA {best_eta} min for severity {incident.severity}/10."
        )

        return DispatchDecision(
            selected_resource=best_resource.id,
            decision_score=round(best_score, 2),
            reason=reason,
            confidence=confidence,
            eta_minutes=best_eta,
        )

    # ── Scoring helper ────────────────────────────────────────────────────
    def _score(self, incident: IncidentCreate, weights: dict, eta: int) -> float:
        return (
            float(incident.severity)       * float(weights.get("severity_weight",  1.5))
            + float(incident.urgency)      * float(weights.get("urgency_weight",   2.0))
            + float(incident.people_affected) * float(weights.get("people_weight", 1.0))
            - float(eta)                   * float(weights.get("distance_penalty", 0.5))
        )
