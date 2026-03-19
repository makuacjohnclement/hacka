import React, { useEffect, useMemo, useState } from 'react';
import { getPdfReportUrl, getExcelReportUrl } from '../services/api';
import { fetchTopAreas } from '../services/api';

const ReportsSection = () => {
  const [filters, setFilters] = useState({ date: '', area: '', type: '' });
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchTopAreas(5)
      .then((data) => { if (mounted) setRanking(Array.isArray(data) ? data : []); })
      .catch(() => { if (mounted) setRanking([]); });
    return () => { mounted = false; };
  }, []);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.area) params.append('area', filters.area);
    if (filters.type) params.append('type', filters.type);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const rows = useMemo(() => ranking, [ranking]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Top Incident Areas</h2>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                <th style={{ paddingBottom: '8px' }}>Area</th>
                <th style={{ paddingBottom: '8px' }}>Cases</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>
                    No ranking data yet (submit incidents to populate).
                  </td>
                </tr>
              ) : rows.map((rank, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0' }}>{rank.area}</td>
                  <td style={{ padding: '8px 0', color: 'var(--danger-color)', fontWeight: 'bold' }}>{rank.incidents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Reports Engine</h2>
        <div className="input-group" style={{ marginBottom: '8px' }}>
          <label className="input-label">Date range (start)</label>
          <input type="date" className="input-field" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} />
        </div>
        <div className="input-group" style={{ marginBottom: '8px' }}>
          <label className="input-label">Area (filter)</label>
          <input type="text" className="input-field" placeholder="e.g. Downtown Square" value={filters.area} onChange={e => setFilters({...filters, area: e.target.value})} />
        </div>
        <div className="input-group" style={{ marginBottom: '12px' }}>
          <label className="input-label">Type (filter)</label>
          <select className="input-field" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">All</option>
            <option>Medical Emergency</option>
            <option>Fire Outbreak</option>
            <option>Traffic Accident</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a href={`${getPdfReportUrl()}${buildQuery()}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              📁 Download PDF 
            </button>
          </a>
          <a href={`${getExcelReportUrl()}${buildQuery()}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              📊 Download Excel
            </button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ReportsSection;
