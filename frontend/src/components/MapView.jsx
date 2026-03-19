import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { resolveIncident } from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ incidents }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    (incidents || []).forEach((inc) => {
      if (inc?.unit_coords) points.push([inc.unit_coords.lat, inc.unit_coords.lng]);
      if (inc?.incident_coords) points.push([inc.incident_coords.lat, inc.incident_coords.lng]);
    });
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 14 });
  }, [incidents, map]);
  return null;
}

const NAIROBI_CENTER = [-1.2921, 36.8219];

function distanceMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getBearing(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const toDeg = (v) => (v * 180) / Math.PI;
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[0]));
  const x =
    Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function getRotatedIcon(unitId, angle) {
  // Ambulance:   https://icons8.com/icon/bM0DT_1pYoZh/ambulance
  // Fire truck:  https://icons8.com/icon/15149/fire-truck
  // Police car:  https://icons8.com/icon/Ah11K7uf_a-N/oncoming-police-car
  // Helicopter:  https://icons8.com/icon/trj9IghVFTfd/hospital-helicopter
  let iconUrl;
  if (unitId?.startsWith('AMB'))
    iconUrl = 'https://img.icons8.com/?size=96&id=bM0DT_1pYoZh&format=png';
  else if (unitId?.startsWith('FIRE'))
    iconUrl = 'https://img.icons8.com/?size=96&id=15149&format=png';
  else if (unitId?.startsWith('POL'))
    iconUrl = 'https://img.icons8.com/?size=96&id=Ah11K7uf_a-N&format=png';
  else if (unitId?.startsWith('HELI'))
    iconUrl = 'https://img.icons8.com/?size=96&id=trj9IghVFTfd&format=png';
  else
    iconUrl = 'https://img.icons8.com/?size=96&id=Ah11K7uf_a-N&format=png';

  return L.divIcon({
    html: `<div style="transform:rotate(${angle}deg);width:40px;height:40px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.7));">
             <img src="${iconUrl}" style="width:40px;height:40px;object-fit:contain;" />
           </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function lerp(a, b, t) { return a + (b - a) * t; }

async function fetchOsrmRoute(from, to) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    return { coords, durationSeconds: route.duration };
  } catch {
    return null;
  }
}

function buildCumDist(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + distanceMeters(coords[i - 1], coords[i]));
  }
  return cum;
}

function positionAlongRoute(coords, cumDist, totalDist, t) {
  if (coords.length === 1) return { lat: coords[0][0], lng: coords[0][1], bearing: 0 };
  const target = Math.min(t * totalDist, totalDist);
  let lo = 0;
  let hi = cumDist.length - 2; // last valid segment start
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cumDist[mid] <= target) lo = mid;
    else hi = mid - 1;
  }
  const nextIdx = Math.min(lo + 1, coords.length - 1);
  const segStart = cumDist[lo];
  const segEnd = cumDist[nextIdx];
  const segLen = segEnd - segStart;
  const segT = segLen > 0 ? (target - segStart) / segLen : 0;
  return {
    lat: lerp(coords[lo][0], coords[nextIdx][0], segT),
    lng: lerp(coords[lo][1], coords[nextIdx][1], segT),
    bearing: getBearing(coords[lo], coords[nextIdx]),
  };
}

// ─── CarMarker ────────────────────────────────────────────────────────────────
function CarMarker({ from, to, unitId, label, incidentId, onArrived, onEtaUpdate }) {
  const markerRef = useRef(null);
  const animationRef = useRef(null); // holds { raf, cancel }
  const [localEta, setLocalEta] = useState(null);
  const [roadPath, setRoadPath] = useState(null);
  const initialIcon = useMemo(() => getRotatedIcon(unitId, getBearing(from, to)), [unitId, from, to]);

  // Stable string keys so the fetch only re-runs when coords actually change
  const routeKey = useMemo(
    () => `${from[0].toFixed(6)},${from[1].toFixed(6)}_${to[0].toFixed(6)},${to[1].toFixed(6)}`,
    [from[0], from[1], to[0], to[1]]
  );

  // ① Fetch road route — keyed on stable string, not array reference
  useEffect(() => {
    let cancelled = false;
    setRoadPath(null);

    // Cancel any running animation before starting a new route
    if (animationRef.current) {
      animationRef.current.cancel = true;
      cancelAnimationFrame(animationRef.current.raf);
    }

    (async () => {
      const result = await fetchOsrmRoute(from, to);
      if (cancelled) return;

      let coords, realEtaSeconds;
      if (result) {
        coords = result.coords;
        realEtaSeconds = result.durationSeconds;
      } else {
        coords = [from, to];
        realEtaSeconds = distanceMeters(from, to) / 14;
      }

      const cumDist = buildCumDist(coords);
      const totalDist = cumDist[cumDist.length - 1];
      // 20× visual speed — car visibly traverses Nairobi in ~10-20 seconds
      const visualDurationMs = Math.max(2000, (totalDist / (14 * 20)) * 1000);

      // Store all route data in a plain object (not state) to avoid extra renders
      const routeData = { coords, cumDist, totalDist, realEtaSeconds, visualDurationMs };

      setRoadPath({ path: coords, routeData });
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  // ② Start animation once route is ready
  useEffect(() => {
    if (!roadPath) return;

    const { coords, cumDist, totalDist, realEtaSeconds, visualDurationMs } = roadPath.routeData;

    // Cancel previous animation if any
    if (animationRef.current) {
      animationRef.current.cancel = true;
      cancelAnimationFrame(animationRef.current.raf);
    }

    const anim = { cancel: false, raf: null };
    animationRef.current = anim;

    const animStart = performance.now();
    let lastEtaEmit = 0;
    let resolvedCalled = false;

    const tick = () => {
      if (anim.cancel) return;
      const now = performance.now();
      const elapsed = now - animStart;
      const t = Math.min(1, elapsed / visualDurationMs);

      const { lat, lng, bearing } = positionAlongRoute(coords, cumDist, totalDist, t);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setIcon(getRotatedIcon(unitId, bearing));
      }

      // Auto-resolve when the car reaches the destination
      if (!resolvedCalled && t >= 1) {
        resolvedCalled = true;
        if (onArrived && incidentId) onArrived(incidentId);
        return; // stop the loop
      }

      // Drain realistic ETA once per second
      if (!resolvedCalled && now - lastEtaEmit > 1000) {
        lastEtaEmit = now;
        const progress = t;
        const etaSeconds = Math.max(0, realEtaSeconds * (1 - progress));
        setLocalEta(etaSeconds);
        if (onEtaUpdate) onEtaUpdate(incidentId, etaSeconds);
      }

      anim.raf = requestAnimationFrame(tick);
    };

    anim.raf = requestAnimationFrame(tick);

    return () => {
      anim.cancel = true;
      cancelAnimationFrame(anim.raf);
    };
  // Only restart animation when the route data itself changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadPath, unitId, incidentId]);

  const formatEta = (sec) => {
    if (sec == null) return 'Calculating...';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  return (
    <>
      {roadPath && (
        <Polyline
          positions={roadPath.path}
          pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '8 10' }}
        />
      )}
      <Marker position={from} icon={initialIcon} ref={markerRef}>
        <Popup>
          <strong>{label}</strong><br />
          ETA: {formatEta(localEta)}
        </Popup>
      </Marker>
    </>
  );
}

// ─── MapView ──────────────────────────────────────────────────────────────────
const MapView = ({ activeIncidents, onIncidentResolved, onEtaUpdate }) => {
  const routes = useMemo(() => {
    return (activeIncidents || [])
      .filter((inc) => inc?.incident_coords && inc?.unit_coords)
      .map((inc) => ({
        id: inc.id,
        from: [inc.unit_coords.lat, inc.unit_coords.lng],
        to: [inc.incident_coords.lat, inc.incident_coords.lng],
        unitId: inc.decision?.selected_resource || 'Unit',
      }));
  }, [activeIncidents]);

  const handleAutoResolve = async (incidentId) => {
    try {
      await resolveIncident(incidentId);
      if (onIncidentResolved) onIncidentResolved();
    } catch (err) {
      console.error('Auto-resolve failed', err);
    }
  };

  return (
    <div className="glass-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem' }}>Live Dispatch Map — Nairobi</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
            Incidents
          </span>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
            Units
          </span>
        </div>
      </div>

      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', minHeight: '400px' }}>
        <MapContainer
          center={NAIROBI_CENTER}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapController incidents={activeIncidents} />

          {routes.map((r) => (
            <CarMarker
              key={r.id}
              from={r.from}
              to={r.to}
              label={`Unit: ${r.unitId}`}
              incidentId={r.id}
              unitId={r.unitId}
              onArrived={handleAutoResolve}
              onEtaUpdate={onEtaUpdate}
            />
          ))}

          {activeIncidents.map((inc) => (
            <React.Fragment key={inc.id}>
              {inc.incident_coords && (
                <CircleMarker
                  center={[inc.incident_coords.lat, inc.incident_coords.lng]}
                  radius={12}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.85 }}
                >
                  <Popup>
                    <strong>{inc.incident_data?.type}</strong><br />
                    📍 {inc.incident_data?.location}<br />
                    🚨 Severity: {inc.incident_data?.severity}/10
                  </Popup>
                </CircleMarker>
              )}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
