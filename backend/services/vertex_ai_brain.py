import json
import os
from typing import Any, Dict, List, Optional

from models.schemas import IncidentCreate, Resource


class VertexAIBrain:
    def __init__(self):
        self.project_id = os.getenv("VERTEX_PROJECT_ID", "").strip()
        self.location = os.getenv("VERTEX_LOCATION", "").strip()
        self.model = os.getenv("VERTEX_MODEL", "gemini-1.5-flash").strip()
        self.enabled = os.getenv("VERTEX_ENABLED", "false").lower() == "true"

    def is_configured(self) -> bool:
        return self.enabled and bool(self.project_id) and bool(self.location) and bool(self.model)

    def decide(
        self,
        *,
        incident: IncidentCreate,
        candidates: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Returns dict with keys:
          selected_resource (str), confidence (float), reason (str)
        or None if Vertex isn't configured or call fails.
        """
        if not self.is_configured():
            return None

        try:
            from google import genai
        except Exception:
            return None

        try:
            client = genai.Client(
                vertexai=True,
                project=self.project_id,
                location=self.location,
            )

            prompt = {
                "role": "system",
                "content": (
                    "You are the dispatch decision brain for an emergency-response system. "
                    "Pick exactly ONE resource to dispatch from the provided candidates. "
                    "Prioritize: correct resource type for incident, fastest ETA, highest severity/urgency, "
                    "and avoiding unavailable units (already filtered). "
                    "Return ONLY strict JSON with keys: selected_resource, confidence, reason. "
                    "confidence must be a number from 0 to 100."
                ),
            }

            user = {
                "role": "user",
                "content": json.dumps(
                    {
                        "incident": incident.model_dump(),
                        "candidates": candidates,
                    },
                    ensure_ascii=False,
                ),
            }

            resp = client.models.generate_content(
                model=self.model,
                contents=[prompt, user],
                config={
                    "temperature": float(os.getenv("VERTEX_TEMPERATURE", "0.2")),
                    "max_output_tokens": int(os.getenv("VERTEX_MAX_TOKENS", "512")),
                },
            )

            text = (getattr(resp, "text", None) or "").strip()
            if not text:
                return None

            # Some models may wrap JSON in fences; strip common wrappers.
            if text.startswith("```"):
                text = text.strip("`")
                # If language tag present, drop first line.
                if "\n" in text:
                    text = text.split("\n", 1)[1].strip()

            data = json.loads(text)
            if not isinstance(data, dict):
                return None

            selected = str(data.get("selected_resource", "")).strip()
            confidence = float(data.get("confidence", 0.0))
            reason = str(data.get("reason", "")).strip()

            if not selected:
                return None

            # Validate selection exists in candidates.
            valid_ids = {str(c.get("id")) for c in candidates}
            if selected not in valid_ids:
                return None

            confidence = max(0.0, min(100.0, confidence))
            if not reason:
                reason = "Selected by Vertex AI brain based on incident context and candidate ETAs."

            return {"selected_resource": selected, "confidence": confidence, "reason": reason}
        except Exception:
            return None


def build_candidate_payload(resources: List[Resource], etas: Dict[str, int]) -> List[Dict[str, Any]]:
    payload: List[Dict[str, Any]] = []
    for r in resources:
        payload.append(
            {
                "id": r.id,
                "type": r.type,
                "location": r.location,
                "eta_minutes": int(etas.get(r.id, 15)),
            }
        )
    return payload

