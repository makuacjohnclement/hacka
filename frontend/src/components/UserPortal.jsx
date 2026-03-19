import React, { useState, useEffect } from 'react';
import { submitCitizenIncident, fetchMyIncidents } from '../services/api';
import { useAuth } from '../context/useAuth';

// Must match the exact strings the backend's fallback geocoder recognises
const NAIROBI_LOCATIONS = [
  'Nairobi CBD',
  'Upper Hill',
  'Westlands',
  'Parklands',
  'Kilimani',
  'Lavington',
  'Karen',
  'Langata',
  'South B',
  'South C',
  'Eastleigh',
  'Embakasi',
  'Donholm',
  'Kawangware',
  'Roysambu',
  'Githurai',
  'Kasarani',
  'Ngong Road',
  'Mombasa Road',
  'JKIA',
  'Kenyatta National Hospital, Nairobi',
  'Aga Khan Hospital, Nairobi',
  'Nairobi West Hospital, Langata',
];

// Must match the backend decision_engine keyword detection
const INCIDENT_TYPES = [
  'Medical Emergency',
  'Fire Outbreak',
  'Traffic Accident',
  'Police Action',
  'Flood',
  'Other',
];
const sev = (n) => {
  if (n <= 3) return '#10b981'; // green
  if (n <= 6) return '#f59e0b'; // amber
  return '#ef4444';             // red
};

const statusBadge = (resolved) => ({
  padding: '3px 10px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: 700,
  background: resolved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
  color: resolved ? '#10b981' : '#ef4444',
  border: `1px solid ${resolved ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
});

function formatDate(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function EstimatedArrival({ etaMinutes }) {
  if (!etaMinutes) return null;
  const h = Math.floor(etaMinutes / 60);
  const m = etaMinutes % 60;
  return (
    <span style={{ color: '#60a5fa', fontWeight: 600 }}>
      ⏱ Est. arrival: {h > 0 ? `${h}h ` : ''}{m}m
    </span>
  );
}

export default function UserPortal() {
  const { logout, currentUser } = useAuth();

  // Form state
  const [type, setType] = useState('Medical Emergency');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState(5);
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [urgency, setUrgency] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Cases state
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);

  const loadCases = async () => {
    try {
      const data = await fetchMyIncidents();
      setCases(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch {
      /* silently ignore poll errors */
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadCases();
    const interval = setInterval(loadCases, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitResult(null);
    setSubmitting(true);
    try {
      const result = await submitCitizenIncident({
        type,
        location,
        severity,
        people_affected: peopleAffected,
        urgency,
      });
      setSubmitResult(result);
      setLocation('');
      setSeverity(5);
      setPeopleAffected(1);
      setUrgency(5);
      loadCases();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Unknown error';
      setSubmitError(`Failed to submit: ${detail}`);
      console.error('Citizen submit error:', err?.response?.data || err);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'white', padding: '24px', boxSizing: 'border-box' }}>
      {/* Ambient blobs */}
      <div className="blur-circle blur-1" />
      <div className="blur-circle blur-2" />

      {/* Header */}
      <header style={{ maxWidth: '900px', margin: '0 auto 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2px' }}>🚨 SmartAid — Citizen Portal</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>{currentUser?.email}</p>
        </div>
        <button
          onClick={logout}
          style={{ padding: '8px 18px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
        >
          Logout
        </button>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* ── Report Form ── */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 Report an Emergency
          </h2>

          {submitResult && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <p style={{ color: '#10b981', fontWeight: 700, marginBottom: '6px' }}>✅ Report submitted to Control Center!</p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                AI suggests: <strong style={{ color: 'white' }}>{submitResult.ai_suggestion?.selected_resource}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                ⏳ Waiting for dispatcher approval...
              </p>
            </div>
          )}

          {submitError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#ef4444', fontSize: '0.875rem' }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Type */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Incident Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box' }}
              >
                {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Location / Area in Nairobi</label>
              <input
                type="text"
                placeholder="e.g. Westlands"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                list="citizen-locations"
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)', color: 'white', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
              <datalist id="citizen-locations">
                {NAIROBI_LOCATIONS.map((loc) => <option key={loc} value={loc} />)}
              </datalist>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                💡 Choose from suggestions for accurate map placement
              </p>
            </div>

            {/* Severity slider */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                Severity — <span style={{ color: sev(severity), fontWeight: 700 }}>{severity}/10</span>
              </label>
              <input type="range" min={1} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))}
                style={{ width: '100%', accentColor: sev(severity) }} />
            </div>

            {/* Urgency slider */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                Urgency — <span style={{ color: sev(urgency), fontWeight: 700 }}>{urgency}/10</span>
              </label>
              <input type="range" min={1} max={10} value={urgency} onChange={(e) => setUrgency(Number(e.target.value))}
                style={{ width: '100%', accentColor: sev(urgency) }} />
            </div>

            {/* People affected */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>People Affected</label>
              <input
                type="number"
                min={0}
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(Number(e.target.value))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)', color: 'white', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '14px', borderRadius: '10px', border: 'none', cursor: submitting ? 'default' : 'pointer', fontWeight: 700, fontSize: '1rem', background: 'var(--accent-color)', color: 'white', opacity: submitting ? 0.6 : 1, transition: 'opacity 0.2s' }}
            >
              {submitting ? '📡 Sending...' : '🚨 Send Emergency Report'}
            </button>
          </form>
        </div>

        {/* ── My Cases ── */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📂 My Reported Cases
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>(auto-updates)</span>
          </h2>

          <div style={{ overflowY: 'auto', flexGrow: 1, maxHeight: '520px', paddingRight: '4px' }}>
            {loadingCases ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '40px' }}>Loading...</p>
            ) : cases.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '40px', lineHeight: 1.6 }}>
                No cases yet.<br />Submit your first report on the left.
              </p>
            ) : (
              cases.map((c) => (
                <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.incident_data?.type}</span>
                    <span style={statusBadge(c.resolved)}>{c.resolved ? '✅ Resolved' : '🔴 Active'}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                    📍 {c.incident_data?.location}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                    🕐 {formatDate(c.timestamp)}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                      Unit: <strong style={{ color: '#60a5fa' }}>{c.decision?.selected_resource}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: `${sev(c.incident_data?.severity)}22`, color: sev(c.incident_data?.severity), border: `1px solid ${sev(c.incident_data?.severity)}44` }}>
                      Sev {c.incident_data?.severity}/10
                    </span>
                  </div>
                  {!c.resolved && (
                    <div style={{ marginTop: '8px' }}>
                      <EstimatedArrival etaMinutes={c.decision?.eta_minutes} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
