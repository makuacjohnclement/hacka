import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'var(--bg-color)',
    color: 'white',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  roleTabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '28px',
    background: 'rgba(0,0,0,0.3)',
    padding: '4px',
    borderRadius: '12px',
  },
  roleTab: (active) => ({
    padding: '10px 0',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 0.2s',
    background: active ? 'var(--accent-color)' : 'transparent',
    color: active ? 'white' : 'rgba(255,255,255,0.5)',
  }),
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.4)',
    color: 'white',
    outline: 'none',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  },
  btn: (color = 'var(--accent-color)') => ({
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '1rem',
    background: color,
    color: 'white',
    transition: 'opacity 0.2s',
    letterSpacing: '0.02em',
  }),
  error: {
    color: 'var(--danger-color)',
    background: 'rgba(239,68,68,0.1)',
    padding: '10px 14px',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '0.875rem',
  },
  toggle: {
    textAlign: 'center',
    marginTop: '18px',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
  },
  toggleLink: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: 'inherit',
  },
};

export default function Login() {
  const [role, setRole] = useState('user'); // 'user' | 'admin'
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const isAdmin = role === 'admin';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password, role);
      } else {
        await signup(email, password, role);
      }
    } catch (err) {
      setError(`${isLogin ? 'Login' : 'Sign-up'} failed: ` + err.message);
    }
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={{ fontSize: '2.5rem', marginBottom: '6px' }}>🚨</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '4px' }}>SmartAid</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
            Emergency Response Platform
          </p>
        </div>

        {/* Role selector */}
        <div style={styles.roleTabs}>
          <button style={styles.roleTab(role === 'user')} onClick={() => { setRole('user'); setError(''); }}>
            👤 Report Emergency
          </button>
          <button style={styles.roleTab(role === 'admin')} onClick={() => { setRole('admin'); setError(''); }}>
            🖥 Control Center
          </button>
        </div>

        {error && <div style={{ ...styles.error, marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="email"
            placeholder={isAdmin ? 'Dispatcher Email' : 'Your Email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn(isAdmin ? '#6366f1' : 'var(--accent-color)'), opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Please wait...' : isAdmin
              ? (isLogin ? '🔐 Access Command Center' : '🔐 Create Dispatcher Account')
              : (isLogin ? '🚨 Access My Cases' : '🚨 Register & Report')}
          </button>
        </form>

        <div style={styles.toggle}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button style={styles.toggleLink} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
