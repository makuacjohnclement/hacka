import React, { useState, useEffect, useCallback } from 'react';
import { fetchPendingIncidents, dispatchPendingIncident } from '../services/api';

const sev = (n) => {
  if (n <= 3) return '#10b981';
  if (n <= 6) return '#f59e0b';
  return '#ef4444';
};

function formatDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

const DispatchQueue = ({ onDispatched }) => {
  const [pendingCases, setPendingCases] = useState([]);
  const [dispatching, setDispatching] = useState(null); // id being dispatched

  const loadPending = useCallback(async () => {
    try {
      const data = await fetchPendingIncidents();
      setPendingCases(data.sort((a, b) => {
        // Sort by severity desc, then timestamp asc
        if (b.incident_data?.severity !== a.incident_data?.severity)
          return (b.incident_data?.severity || 0) - (a.incident_data?.severity || 0);
        return new Date(a.timestamp) - new Date(b.timestamp);
      }));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadPending();
    const timer = setInterval(loadPending, 3000);
    return () => clearInterval(timer);
  }, [loadPending]);

  const handleDispatch = async (id) => {
    setDispatching(id);
    try {
      const result = await dispatchPendingIncident(id);
      await loadPending(); // refresh pending list
      if (onDispatched) onDispatched(result); // tell parent to reload active incidents + show decision
    } catch (err) {
      console.error('Dispatch failed', err);
    }
    setDispatching(null);
  };

  return (
    <div
      className="glass-panel"
      style={{ borderLeft: '4px solid #f59e0b', position: 'relative' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '1.1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📥 Citizen Reports
          {pendingCases.length > 0 && (
            <span style={{
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 800,
              animation: 'pulse 1.5s infinite',
            }}>
              {pendingCases.length}
            </span>
          )}
        </h2>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Pending Dispatch</span>
      </div>

      {/* Pulse animation */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {pendingCases.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', textAlign: 'center', padding: '14px 0' }}>
          No pending reports
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
          {pendingCases.map((inc) => (
            <div
              key={inc.id}
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '12px',
                padding: '12px',
              }}
            >
              {/* Row 1 — type + severity */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  👤 {inc.incident_data?.type}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  background: `${sev(inc.incident_data?.severity)}22`,
                  color: sev(inc.incident_data?.severity),
                  border: `1px solid ${sev(inc.incident_data?.severity)}44`,
                  fontWeight: 700,
                }}>
                  Sev {inc.incident_data?.severity}/10
                </span>
              </div>

              {/* Row 2 — location + time */}
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
                📍 {inc.incident_data?.location}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                🕐 {formatDate(inc.timestamp)} &nbsp;·&nbsp; {inc.incident_data?.people_affected} affected
              </p>

              {/* AI suggestion */}
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
                🤖 AI suggests: <strong style={{ color: '#60a5fa' }}>{inc.decision?.selected_resource}</strong>
                {' '}·{' '}
                <span>ETA ~{inc.decision?.eta_minutes}m</span>
              </div>

              {/* Dispatch button */}
              <button
                onClick={() => handleDispatch(inc.id)}
                disabled={dispatching === inc.id}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: dispatching === inc.id ? 'default' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  background: dispatching === inc.id ? 'rgba(59,130,246,0.3)' : '#3b82f6',
                  color: 'white',
                  opacity: dispatching === inc.id ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {dispatching === inc.id ? '📡 Dispatching...' : '🚨 Dispatch Unit'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DispatchQueue;
