import React from 'react';
import { resolveIncident } from '../services/api';

const formatEta = (sec) => {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
};

const LiveTracker = ({ incidents, onResolved, liveEtas }) => {
  const handleResolve = async (id) => {
    try {
      await resolveIncident(id);
      onResolved();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Active Dispatches</h2>
      
      <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
        {incidents.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>No active cases.</p>
        ) : (
          incidents.map((inc) => (
            <div key={inc.id} className="tracker-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--danger-color)' }}>{inc.incident_data.type}</span>
                <span className="badge badge-warning">
                  ETA {liveEtas?.[inc.id]?.etaSeconds != null 
                    ? formatEta(liveEtas[inc.id].etaSeconds) 
                    : `${inc.decision.eta_minutes}m 0s`}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '4px' }}>Location: {inc.incident_data.location}</p>
              <p style={{ fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '12px' }}>Unit: {inc.decision.selected_resource}</p>
              
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '8px', fontSize: '0.8rem', border: '1px solid rgba(16, 185, 129, 0.5)', color: 'var(--success-color)' }}
                onClick={() => handleResolve(inc.id)}
              >
                Mark Resolved (Trigger Learning)
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveTracker;
