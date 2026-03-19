try:
    import googlemaps
except ImportError:
    googlemaps = None
from datetime import datetime
import re

class MapService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self._gmaps = None
        if api_key:
            try:
                import googlemaps
                self._gmaps = googlemaps.Client(key=api_key)
            except Exception as e:
                print("[WARN] googlemaps client failed to init:", e)

    def calculate_eta(self, origin: str, destination: str) -> int:
        if self._gmaps:
            try:
                now = datetime.now()
                result = self._gmaps.distance_matrix(origin, destination, mode="driving", departure_time=now)
                rows = result.get('rows', [])
                if not rows: return 15
                elements = rows[0].get('elements', [])
                if not elements or elements[0].get('status') != 'OK': return 15
                duration_sec = elements[0]['duration_in_traffic']['value'] if 'duration_in_traffic' in elements[0] else elements[0]['duration']['value']
                return int(duration_sec / 60)
            except Exception as e:
                print("ETA Calc Error:", e)
        return 15

    def get_distance(self, origin: str, destination: str) -> float:
        return 5.0

    def geocode(self, address: str):
        if self._gmaps:
            try:
                res = self._gmaps.geocode(address)
                if res:
                    return res[0]['geometry']['location']
            except Exception as e:
                print("Geocode error:", e)
        # Nairobi-area offline fallback: match known stations/areas to real coordinates
        return self._fallback_geocode(address)

    @staticmethod
    def _normalize_place(s: str) -> str:
        s = (s or "").lower().strip()
        s = re.sub(r"[^a-z0-9\s,.-]", " ", s)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    def _fallback_geocode(self, address: str):
        a = self._normalize_place(address)

        # Known Nairobi emergency resources (approximate real coordinates)
        known = {
            "kenyatta national hospital": {"lat": -1.3006, "lng": 36.8073},
            "aga khan hospital": {"lat": -1.2635, "lng": 36.8125},
            "nairobi west hospital": {"lat": -1.3123, "lng": 36.7875},
            "central fire station": {"lat": -1.2858, "lng": 36.8241},
            "industrial area fire station": {"lat": -1.3152, "lng": 36.8460},
            "central police station": {"lat": -1.2846, "lng": 36.8256},
            "westlands police station": {"lat": -1.2660, "lng": 36.8051},
            "kasarani police station": {"lat": -1.2292, "lng": 36.8892},
        }

        # Common Nairobi incident areas (approximate real coordinates)
        areas = {
            "nairobi cbd": {"lat": -1.2866, "lng": 36.8231},
            "cbd": {"lat": -1.2866, "lng": 36.8231},
            "upper hill": {"lat": -1.3032, "lng": 36.8148},
            "westlands": {"lat": -1.2681, "lng": 36.8110},
            "parklands": {"lat": -1.2630, "lng": 36.8094},
            "kilimani": {"lat": -1.2927, "lng": 36.7829},
            "lavington": {"lat": -1.2838, "lng": 36.7662},
            "karen": {"lat": -1.3200, "lng": 36.6978},
            "langata": {"lat": -1.3546, "lng": 36.7430},
            "south b": {"lat": -1.3147, "lng": 36.8310},
            "south c": {"lat": -1.3227, "lng": 36.8173},
            "eastleigh": {"lat": -1.2727, "lng": 36.8526},
            "embakasi": {"lat": -1.3297, "lng": 36.9085},
            "donholm": {"lat": -1.2938, "lng": 36.9001},
            "kawangware": {"lat": -1.2786, "lng": 36.7388},
            "roysambu": {"lat": -1.2188, "lng": 36.8898},
            "githurai": {"lat": -1.1913, "lng": 36.9010},
            "kasarani": {"lat": -1.2292, "lng": 36.8892},
            "ruiru": {"lat": -1.1489, "lng": 36.9611},
            "juja": {"lat": -1.1048, "lng": 37.0117},
            "ngong road": {"lat": -1.3098, "lng": 36.7870},
            "mombasa road": {"lat": -1.3258, "lng": 36.8574},
            "jomo kenyatta international airport": {"lat": -1.3192, "lng": 36.9278},
            "jkia": {"lat": -1.3192, "lng": 36.9278},
        }

        # Backwards-compat for old demo location strings
        demo_aliases = {
            "downtown square": "nairobi cbd",
            "north district": "roysambu",
            "east district": "eastleigh",
        }

        if a in demo_aliases:
            a = demo_aliases[a]

        for k, v in known.items():
            if k in a:
                return v

        for k, v in areas.items():
            if k in a:
                return v

        # Default Nairobi CBD center if we can't match anything
        return {"lat": -1.2866, "lng": 36.8231}

