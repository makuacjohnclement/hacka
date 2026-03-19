import React from 'react';

const DashboardStats = ({ activeCount }) => {
  return (
    <div className="glass-panel">
      <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>System Overview</h2>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Active Cases</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>
            98.5%
          </div>
          <div className="stat-label">AI Accuracy</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--warning-color)' }}>
            <span style={{ fontSize: '1.2rem' }}>Avg </span> 4m
          </div>
          <div className="stat-label">Response Time</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">24/7</div>
          <div className="stat-label">System Uptime</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
