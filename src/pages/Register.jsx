// src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { detectLocation } from '../lib/location';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const FEATURES = [
  'AI-generated polls in under 10 seconds',
  'Real-time results with live analytics',
  'Target specific demographics worldwide',
  '1M+ votes cast on the platform',
];

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

export default function Register() {
  const navigate = useNavigate();

  const [userType, setUserType] = useState('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgCountry, setOrgCountry] = useState('');
  const [orgCity, setOrgCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Password strength
  const [passwordChecks, setPasswordChecks] = useState({
    length: false, upper: false, lower: false, number: false, special: false,
  });

  useEffect(() => {
    setPasswordChecks({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  // Username availability
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (username.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUsername(true);
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snap = await getDocs(q);
        setUsernameAvailable(snap.empty);
      } catch {
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [username]);

  // Detect location (IP + GPS)
  useEffect(() => {
    const getLocation = async () => {
      const loc = await detectLocation();
      setDetectedLocation(loc);
      setLocationLoading(false);
    };
    getLocation();
  }, []);

  const validatePhone = (num) => {
    if (!num.trim()) return true;
    const parsed = parsePhoneNumberFromString(num);
    return parsed?.isValid() || false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameAvailable !== true) {
      alert('Username not available');
      return;
    }
    if (userType === 'individual' && !name.trim()) {
      alert('Full name is required');
      return;
    }
    if (userType === 'organization' && !orgName.trim()) {
      alert('Organization name is required');
      return;
    }
    if (!validatePhone(phone)) {
      alert('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      const displayName = userType === 'individual' ? name : orgName;
      await updateProfile(user, { displayName });

      const locationData = detectedLocation || { country: null, city: null };
      const userData = {
        uid: user.uid,
        name: displayName,
        email,
        username: username.toLowerCase(),
        type: userType,
        tier: 'free',
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        followersCount: 0,
        followingCount: 0,
        pollsCreated: 0,
        pollsThisMonth: 0,
        phone: phone || null,
        location: {
          country: locationData.country || null,
          city: userType === 'individual' ? null : orgCity,
        },
      };
      if (userType === 'individual') {
        if (age) userData.age = parseInt(age);
        if (gender) userData.gender = gender;
      } else {
        userData.organization = { name: orgName, size: null, industry: null, tagline: null, verified: false };
        userData.location.country = orgCountry;
        userData.location.city = orgCity;
      }
      await setDoc(doc(db, 'users', user.uid), userData);
      await sendEmailVerification(user);
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      let msg = 'Registration failed';
      if (err.code === 'auth/email-already-in-use') msg = 'Email already in use';
      else if (err.code === 'auth/invalid-email') msg = 'Invalid email';
      else if (err.code === 'auth/weak-password') msg = 'Password too weak';
      else msg = err.message;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const allChecksPassed = Object.values(passwordChecks).every(v => v === true);
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
      <AuthLeft title="Join PollMeNow" sub="Start creating polls, gather insights, and grow your audience." />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 48px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 6 }}>Create account</h1>
          <p style={{ fontSize: 14, color: '#9898a8', marginBottom: 28 }}>
            Already have an account? <Link to="/login" style={{ color: '#6C5CE7', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Account type toggle */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
              <button type="button" onClick={() => setUserType('individual')} style={{ flex: 1, background: userType === 'individual' ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : '#fff', color: userType === 'individual' ? '#fff' : '#6b6b7b', border: '1px solid #e8e8ee', borderRadius: 12, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>Individual</button>
              <button type="button" onClick={() => setUserType('organization')} style={{ flex: 1, background: userType === 'organization' ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : '#fff', color: userType === 'organization' ? '#fff' : '#6b6b7b', border: '1px solid #e8e8ee', borderRadius: 12, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>Organization</button>
            </div>

            {/* Common fields */}
            <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Email *</label><input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Username *</label><input style={inp} value={username} onChange={e => setUsername(e.target.value)} required />
              {username.length >= 3 && <p style={{ fontSize: 10, marginTop: 3, color: usernameAvailable === true ? '#22c55e' : usernameAvailable === false ? '#ef4444' : '#9898a8' }}>{checkingUsername ? 'Checking...' : usernameAvailable === true ? '✓ Available' : usernameAvailable === false ? '✗ Taken' : ''}</p>}
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Password *</label><input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: 10, color: '#9898a8' }}>
                <span style={{ color: passwordChecks.length ? '#22c55e' : '#ef4444' }}>✓ 8+ chars</span>
                <span style={{ color: passwordChecks.upper ? '#22c55e' : '#ef4444' }}>✓ Uppercase</span>
                <span style={{ color: passwordChecks.lower ? '#22c55e' : '#ef4444' }}>✓ Lowercase</span>
                <span style={{ color: passwordChecks.number ? '#22c55e' : '#ef4444' }}>✓ Number</span>
                <span style={{ color: passwordChecks.special ? '#22c55e' : '#ef4444' }}>✓ Special</span>
              </div>
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Phone (optional)</label><input style={inp} type="tel" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} /></div>

            {/* Individual fields */}
            {userType === 'individual' && (
              <>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Full name *</label><input style={inp} value={name} onChange={e => setName(e.target.value)} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Age</label><input style={inp} type="number" value={age} onChange={e => setAge(e.target.value)} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Gender</label><select style={inp} value={gender} onChange={e => setGender(e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></div>
                </div>
                {locationLoading && <p style={{ fontSize: 11, color: '#9898a8' }}>Detecting location...</p>}
                {detectedLocation?.country && <p style={{ fontSize: 11, color: '#22c55e' }}>📍 Country detected: {detectedLocation.country}</p>}
              </>
            )}

            {/* Organization fields */}
            {userType === 'organization' && (
              <>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Organization name *</label><input style={inp} value={orgName} onChange={e => setOrgName(e.target.value)} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>Country *</label><input style={inp} value={orgCountry} onChange={e => setOrgCountry(e.target.value)} required /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6b7b', marginBottom: 4, display: 'block' }}>City *</label><input style={inp} value={orgCity} onChange={e => setOrgCity(e.target.value)} required /></div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || !allChecksPassed || usernameAvailable !== true}
              style={{
                background: (loading || !allChecksPassed || usernameAvailable !== true) ? '#e8e8ee' : 'linear-gradient(135deg,#6C5CE7,#a855f7)',
                color: (loading || !allChecksPassed || usernameAvailable !== true) ? '#aaa' : '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '13px',
                fontSize: 15,
                fontWeight: 800,
                cursor: (loading || !allChecksPassed || usernameAvailable !== true) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid #aaa', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Creating account...
                </>
              ) : (
                'Create account'
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
            .auth-split { grid-template-columns: 1fr !important; }
            .auth-left { display: none; }
          }
        `}
      </style>
    </div>
  );
}