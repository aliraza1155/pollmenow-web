// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

const FEATURES = [
  'AI-generated polls in under 10 seconds',
  'Real-time results with live analytics',
  'Target specific demographics worldwide',
  '1M+ votes cast on the platform',
];

const AUTH_ERROR_MSGS = {
  'auth/user-not-found':     'No account found with this email.',
  'auth/wrong-password':     'Incorrect password.',
  'auth/invalid-email':      'Invalid email address.',
  'auth/too-many-requests':  'Too many attempts. Try again later.',
  'auth/invalid-credential': 'Invalid email or password.',
};

function AuthLeft({ title, sub }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a855f7 60%, #ec4899 100%)', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>P</div>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>PollMeNow</span>
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 12 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', lineHeight: 1.6, marginBottom: 36 }}>{sub}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FEATURES.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0, marginTop: 1 }}>✓</div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.9)', lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40, background: 'rgba(255,255,255,.12)', borderRadius: 16, padding: '18px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.8)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Live · Trending</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>"What's the most critical feature for 2026?"</p>
        {[{ label: 'AI Automation', pct: 44 }, { label: 'Privacy Control', pct: 30 }, { label: 'Cross-Platform', pct: 26 }].map(bar => (
          <div key={bar.label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.8)', marginBottom: 4 }}>
              <span>{bar.label}</span><span style={{ fontWeight: 700 }}>{bar.pct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${bar.pct}%`, background: '#fff', borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        navigate('/verify-email', { state: { email } });
        return;
      }
      navigate('/');
    } catch (err) {
      setError(AUTH_ERROR_MSGS[err.code] || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError('Google sign-in failed.');
    }
  };

  const inp = {
    width: '100%',
    background: '#f7f7fb',
    border: '1px solid #e8e8ee',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    color: '#111',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fff' }}>
      <AuthLeft title="Welcome back to PollMeNow" sub="Sign in to create polls, track your analytics, and engage with your audience." />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 48px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 6 }}>Sign in</h1>
          <p style={{ fontSize: 14, color: '#9898a8', marginBottom: 28 }}>
            Don't have an account? <Link to="/register" style={{ color: '#6C5CE7', fontWeight: 700, textDecoration: 'none' }}>Create one free →</Link>
          </p>

          <button
            onClick={handleGoogle}
            style={{
              width: '100%',
              background: '#fff',
              border: '1px solid #e8e8ee',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#111',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 20,
              transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <span style={{ fontSize: 18 }}>G</span> Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
            <span style={{ fontSize: 12, color: '#bbb' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6b7b', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Email address</label>
              <input
                style={inp}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                onFocus={e => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={e => (e.target.style.borderColor = '#e8e8ee')}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Password</label>
                <Link to="/reset-password" style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 600, textDecoration: 'none' }}>Forgot?</Link>
              </div>
              <input
                style={inp}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                onFocus={e => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={e => (e.target.style.borderColor = '#e8e8ee')}
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#7f1d1d', fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#e8e8ee' : 'linear-gradient(135deg,#6C5CE7,#a855f7)',
                color: loading ? '#aaa' : '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '13px',
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid #aaa', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @media (max-width: 768px) {
            .login-split { grid-template-columns: 1fr !important; }
            .auth-left { display: none; }
          }
        `}
      </style>
    </div>
  );
}