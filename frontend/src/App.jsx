import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Login from './components/Login';
import DashboardStats from './components/DashboardStats';
import MapView from './components/MapView';
import IncidentCard from './components/IncidentCard';
import DecisionPanel from './components/DecisionPanel';
import LiveTracker from './components/LiveTracker';
import ReportsSection from './components/ReportsSection';
import UserPortal from './components/UserPortal';
import DispatchQueue from './components/DispatchQueue';
import { fetchActiveIncidents } from './services/api';

function AppContent() {
  const { currentUser, logout, userRole } = useAuth();
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [latestDecision, setLatestDecision] = useState(null);
  const [liveEtas, setLiveEtas] = useState({});

  const loadIncidents = async () => {
    try {
      const data = await fetchActiveIncidents();
      setActiveIncidents(data);
    } catch (err) {
      console.error("Failed to load active incidents", err);
    }
  };

  useEffect(() => {
    if (userRole !== 'admin') return;
    const interval = setInterval(loadIncidents, 3000);
    const initialId = setTimeout(loadIncidents, 0);
    return () => {
      clearTimeout(initialId);
      clearInterval(interval);
    };
  }, [userRole]);

  const handleIncidentSubmitted = (result) => {
    setLatestDecision(result.ai_decision || result.ai_suggestion || null);
    loadIncidents();
  };

  const handleEtaUpdate = (incidentId, etaSeconds) => {
    setLiveEtas((prev) => {
      const prevEntry = prev[incidentId] || {};
      if (prevEntry.etaSeconds === etaSeconds) return prev;
      return { ...prev, [incidentId]: { ...prevEntry, etaSeconds } };
    });
  };

  useEffect(() => {
    const activeIds = new Set(activeIncidents.map((i) => i.id));
    const t = setTimeout(() => {
      setLiveEtas((prev) => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) {
          if (activeIds.has(k)) next[k] = v;
        }
        return next;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [activeIncidents]);

  // Not logged in → show login
  if (!currentUser) return <Login />;

  // Logged in as public user → show citizen portal
  if (userRole === 'user') return <UserPortal />;

  return (
    <>
      <div className="blur-circle blur-1"></div>
      <div className="blur-circle blur-2"></div>
      
      <div className="dashboard-layout">
        <header className="header">
          <h1>
            <div className="header-logo-glow"></div>
            SmartAid Command Center
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="badge badge-success">System Active</div>
            <button onClick={logout} style={{ padding: '6px 12px', borderRadius: '20px', background: 'var(--danger-color)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Logout</button>
          </div>
        </header>

        <aside className="left-sidebar">
          <DispatchQueue onDispatched={handleIncidentSubmitted} />
          <DashboardStats activeCount={activeIncidents.length} />
          <IncidentCard onSubmitted={handleIncidentSubmitted} />
          <DecisionPanel decision={latestDecision} />
        </aside>

        <main className="main-content">
          <MapView
            activeIncidents={activeIncidents}
            onIncidentResolved={loadIncidents}
            onEtaUpdate={handleEtaUpdate}
          />
        </main>

        <aside className="right-sidebar">
          <LiveTracker incidents={activeIncidents} onResolved={loadIncidents} liveEtas={liveEtas} />
          <ReportsSection />
        </aside>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
