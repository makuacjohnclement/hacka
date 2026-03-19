import React, { useEffect, useState } from 'react';

const sev = (n) => {
  if (n <= 3) return '#10b981';
  if (n <= 6) return '#f59e0b';
  return '#ef4444';
};

function formatDate(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

// Shows ALL active incidents (including those submitted by citizens)
// so the dispatcher can see incoming reports from the field.
const ReportedCases = ({ activeIncidents }) => {
  // Citizen-submitted cases have a reporter_uid field (not set for dispatcher-submitted)
  const citizenCases = (activeIncidents || []).filter((inc) => inc.reporter_uid && inc.reporter_uid !== 'dev-user' && inc.reporter_uid !== 'unknown');
  const allActive = (activeIncidents || []);

  return (
    <div className="glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '1.1rem', color: '#f59e0b' }}>📥 Incoming Reports</h2>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Citizen</span>
          <span style={{
            background: 'rgba(245,158,11,0.2)',
            border: '1px solid rgba(245,158,11,0.5)',
            color: '#f59e0b',
            borderRadius: '20px',
            padding: '1px 8px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>{citizenCases.length}</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginLeft: '6px' }}>Total</span>
          <span style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#ef4444',
            borderRadius: '20px',
            padding: '1px 8px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>{allActive.length}</span>
        </div>
      </div>

      {allActive.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
          No active incidents
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
          {allActive.map((inc) => {
            const isCitizen = inc.reporter_uid && inc.reporter_uid !== 'dev-user' && inc.reporter_uid !== 'unknown';
            return (
              <div
                key={inc.id}
                style={{
                  background: isCitizen ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isCitizen ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {isCitizen && <span style={{ color: '#f59e0b', marginRight: '6px', fontSize: '0.72rem', fontWeight: 700 }}>👤 CITIZEN</span>}
                    {inc.incident_data?.type}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: '8px',
                    background: `${sev(inc.incident_data?.severity)}22`,
                    color: sev(inc.incident_data?.severity),
                    border: `1px solid ${sev(inc.incident_data?.severity)}44`,
                    fontWeight: 700,
                  }}>
                    Sev {inc.incident_data?.severity}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
                  📍 {inc.incident_data?.location}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                    🚑 {inc.decision?.selected_resource}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                    {formatDate(inc.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportedCases;
