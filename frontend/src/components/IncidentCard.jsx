import React, { useState } from 'react';
import { submitIncident } from '../services/api';

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

const IncidentCard = ({ onSubmitted }) => {
  const [formData, setFormData] = useState({
    type: 'Medical Emergency',
    location: 'Nairobi CBD',
    severity: 5,
    people_affected: 1,
    urgency: 5
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        severity: Number(formData.severity),
        people_affected: Number(formData.people_affected),
        urgency: Number(formData.urgency)
      };
      const result = await submitIncident(payload);
      onSubmitted(result);
      
      // slightly reset form logic
      setFormData(f => ({ ...f, location: '', severity: 5 }));
    } catch (error) {
      console.error("Error submitting incident:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger-color)' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', color: 'var(--danger-color)' }}>New Dispatch Request</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Incident Type</label>
          <select name="type" className="input-field" value={formData.type} onChange={handleChange}>
            <option>Medical Emergency</option>
            <option>Fire Outbreak</option>
            <option>Traffic Accident</option>
            <option>Police Action</option>
          </select>
        </div>
        
        <div className="input-group">
          <label className="input-label">Location</label>
          <input
            type="text"
            name="location"
            className="input-field"
            value={formData.location}
            onChange={handleChange}
            list="nairobi-locations"
            required
          />
          <datalist id="nairobi-locations">
            {NAIROBI_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div className="input-group">
            <label className="input-label">Severity (1-10)</label>
            <input type="number" name="severity" min="1" max="10" className="input-field" value={formData.severity} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label className="input-label">Urgency (1-10)</label>
            <input type="number" name="urgency" min="1" max="10" className="input-field" value={formData.urgency} onChange={handleChange} required />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Processing AI..." : "Submit Incident"}
        </button>
      </form>
    </div>
  );
};

export default IncidentCard;
