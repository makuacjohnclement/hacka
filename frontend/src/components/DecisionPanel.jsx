import React from 'react';

const DecisionPanel = ({ decision }) => {
  if (!decision) return null;

  return (
    <div className="glass-panel" style={{ borderLeft: '4px solid var(--success-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>AI Decision</h2>
        <span className="badge badge-success">Confidence {decision.confidence}%</span>
      </div>
      
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dispatched Resource</p>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
          {decision.selected_resource}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>ETA</p>
          <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>{decision.eta_minutes} mins</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Score</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>{decision.decision_score}</p>
        </div>
      </div>

      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', borderLeft: '2px solid var(--text-secondary)' }}>
        <p style={{ fontSize: '0.85rem', color: '#c9d1d9', fontStyle: 'italic' }}>
          "{decision.reason}"
        </p>
      </div>
    </div>
  );
};

export default DecisionPanel;
