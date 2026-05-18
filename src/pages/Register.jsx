// src/pages/Register.jsx – dark/light mode aware + age validation (13-120)
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import {
  doc, setDoc, getDocs, query, collection, where,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { detectLocation } from '../lib/location';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { motion } from 'framer-motion';

const FEATURES = [
  'AI-generated polls in under 10 seconds',
  'Real-time results with live analytics',
  'Target specific demographics worldwide',
  '1M+ votes cast on the platform',
];

// ─── Left panel (always dark – Design 1 palette) ─────────────
function AuthLeft() {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-[#08091a] p-8 lg:p-12 text-[#f0f0ff] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1120] via-[#08091a] to-[#0d0a1e] pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#e5184c]/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-primary/20 border border-primary/35 rounded-xl flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 h-2 bg-primary rounded-sm" />
              <span className="w-1 h-3.5 bg-secondary rounded-sm" />
              <span className="w-1 h-2.5 bg-[#e5184c] rounded-sm" />
              <span className="w-1 h-1.5 bg-primary rounded-sm" />
            </div>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Poll<span className="text-secondary">Me</span>Now
          </span>
        </div>

        <h2 className="text-3xl lg:text-4xl font-semibold leading-tight mb-3 text-[#f0f0ff]">
          Join PollMeNow
        </h2>
        <p className="text-[rgba(240,240,255,0.5)] text-sm lg:text-base mb-10 leading-relaxed">
          Start creating polls, gather insights,<br className="hidden lg:block" />
          and grow your audience.
        </p>

        <div className="space-y-3 mb-10">
          {FEATURES.map(f => (
            <div key={f} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs text-secondary flex-shrink-0 mt-0.5">✓</div>
              <span className="text-sm text-[rgba(240,240,255,0.7)]">{f}</span>
            </div>
          ))}
        </div>

        {/* Live poll preview */}
        <div className="bg-[#0f1120] border border-white/8 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-[rgba(240,240,255,0.45)]">Live · Trending</span>
          </div>
          <p className="text-sm font-semibold mb-4 text-[#f0f0ff]">"What's the most critical feature for 2026?"</p>
          {[
            { label: 'AI Automation',  pct: 44, color: '#7c2fff' },
            { label: 'Privacy Control', pct: 30, color: '#a855f7' },
            { label: 'Cross-Platform', pct: 26, color: '#e5184c' },
          ].map(bar => (
            <div key={bar.label} className="mb-3">
              <div className="flex justify-between text-xs mb-1 text-[rgba(240,240,255,0.55)]">
                <span>{bar.label}</span>
                <span className="font-bold text-[rgba(240,240,255,0.8)]">{bar.pct}%</span>
              </div>
              <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${bar.pct}%`, backgroundColor: bar.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get('email') || '';
  const redirect = searchParams.get('redirect') || null;

  const [userType,   setUserType]   = useState('individual');
  const [email,      setEmail]      = useState(prefilledEmail);
  const [password,   setPassword]   = useState('');
  const [name,       setName]       = useState('');
  const [username,   setUsername]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [age,        setAge]        = useState('');
  const [gender,     setGender]     = useState('');
  const [orgName,    setOrgName]    = useState('');
  const [orgCountry, setOrgCountry] = useState('');
  const [orgCity,    setOrgCity]    = useState('');
  const [loading,    setLoading]    = useState(false);

  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername,  setCheckingUsername]  = useState(false);
  const [detectedLocation,  setDetectedLocation]  = useState(null);
  const [locationLoading,   setLocationLoading]   = useState(true);

  const [passwordChecks, setPasswordChecks] = useState({
    length: false, upper: false, lower: false, number: false, special: false,
  });

  useEffect(() => {
    setPasswordChecks({
      length:  password.length >= 8,
      upper:   /[A-Z]/.test(password),
      lower:   /[a-z]/.test(password),
      number:  /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (username.length < 3) { setUsernameAvailable(null); return; }
      setCheckingUsername(true);
      try {
        const snap = await getDocs(query(collection(db,'users'), where('username','==',username.toLowerCase())));
        setUsernameAvailable(snap.empty);
      } catch { setUsernameAvailable(false); }
      finally { setCheckingUsername(false); }
    }, 500);
    return () => clearTimeout(delay);
  }, [username]);

  useEffect(() => {
    detectLocation().then(loc => { setDetectedLocation(loc); setLocationLoading(false); });
  }, []);

  const validatePhone = num => {
    if (!num.trim()) return true;
    return parsePhoneNumberFromString(num)?.isValid() || false;
  };

  const validateAge = (ageValue) => {
    if (!ageValue) return true;
    const ageNum = parseInt(ageValue, 10);
    return !isNaN(ageNum) && ageNum >= 13 && ageNum <= 120;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameAvailable !== true) { alert('Username not available'); return; }
    if (userType === 'individual' && !name.trim()) { alert('Full name is required'); return; }
    if (userType === 'organization' && !orgName.trim()) { alert('Organization name is required'); return; }
    if (userType === 'individual' && !validatePhone(phone)) { alert('Please enter a valid phone number with country code'); return; }
    if (userType === 'individual' && !validateAge(age)) { alert('Please enter a valid age between 13 and 120 (or leave blank).'); return; }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const displayName = userType === 'individual' ? name : orgName;
      await updateProfile(user, { displayName });

      const loc = detectedLocation || { country: null, city: null };
      const userData = {
        uid: user.uid, name: displayName, email, username: username.toLowerCase(),
        type: userType, tier: 'free', verified: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        followersCount: 0, followingCount: 0, pollsCreated: 0, pollsThisMonth: 0,
        phone: phone || null,
        location: { country: loc.country || null, city: userType === 'individual' ? null : orgCity },
        memberships: {}, activeAccount: 'personal',
      };

      if (userType === 'individual') {
        if (age) userData.age = parseInt(age, 10);
        if (gender) userData.gender = gender;
      } else {
        userData.organization = { name: orgName, size: null, industry: null, tagline: null, verified: false };
        userData.location.country = orgCountry;
        userData.location.city = orgCity;
      }
      await setDoc(doc(db, 'users', user.uid), userData);

      if (userType === 'organization') {
        await setDoc(doc(db, 'organizations', user.uid), {
          name: orgName, ownerId: user.uid, createdAt: serverTimestamp(),
          settings: { allowMemberInvites: true, defaultRole: 'member' },
        });
        await updateDoc(doc(db, 'users', user.uid), {
          [`memberships.${user.uid}`]: { role: 'owner', name: orgName, joinedAt: serverTimestamp() },
          activeAccount: user.uid,
        });
      }

      await sendEmailVerification(user);
      navigate('/verify-email', { state: { email, redirect } });
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Email already in use',
        'auth/invalid-email':        'Invalid email',
        'auth/weak-password':        'Password too weak',
      };
      alert(msgs[err.code] || err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const allChecksPassed = Object.values(passwordChecks).every(Boolean);

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm
    bg-gray-50 dark:bg-white/5
    border border-gray-200 dark:border-white/12
    text-gray-900 dark:text-[#f0f0ff]
    placeholder-gray-400 dark:placeholder-[rgba(240,240,255,0.35)]
    focus:border-primary dark:focus:border-primary
    focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/25
    outline-none transition`;

  const labelCls = 'block text-xs font-bold text-gray-500 dark:text-[rgba(240,240,255,0.45)] uppercase tracking-wide mb-1.5';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#08091a]">
      <AuthLeft />

      <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12 bg-white dark:bg-[#08091a] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md py-4"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-3.5">
                <span className="w-0.5 h-1.5 bg-white rounded-sm" />
                <span className="w-0.5 h-3 bg-white rounded-sm" />
                <span className="w-0.5 h-2 bg-white rounded-sm" />
                <span className="w-0.5 h-1 bg-white rounded-sm" />
              </div>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">PollMeNow</span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">Create account</h1>
            <p className="text-gray-500 dark:text-[rgba(240,240,255,0.5)] mt-2 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in →</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account type toggle */}
            <div className="flex gap-3">
              {['individual','organization'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUserType(t)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition ${
                    userType === t
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                      : 'border border-gray-200 dark:border-white/12 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={inputCls} required />
            </div>

            {/* Username */}
            <div>
              <label className={labelCls}>Username *</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} className={inputCls} required />
              {username.length >= 3 && (
                <p className={`text-xs mt-1 ${usernameAvailable === true ? 'text-green-600 dark:text-green-400' : usernameAvailable === false ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {checkingUsername ? 'Checking…' : usernameAvailable === true ? '✓ Available' : usernameAvailable === false ? '✗ Taken' : ''}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className={labelCls}>Password *</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className={inputCls} required />
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {[
                  { key:'length',  label:'8+ chars'   },
                  { key:'upper',   label:'Uppercase'   },
                  { key:'lower',   label:'Lowercase'   },
                  { key:'number',  label:'Number'      },
                  { key:'special', label:'Special'     },
                ].map(c => (
                  <span key={c.key} className={passwordChecks[c.key] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                    ✓ {c.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Phone (individual only) */}
            {userType === 'individual' && (
              <div>
                <label className={labelCls}>Phone (optional)</label>
                <input type="tel" placeholder="+1234567890" value={phone} onChange={e=>setPhone(e.target.value)} className={inputCls} />
              </div>
            )}

            {/* Individual fields */}
            {userType === 'individual' && (
              <>
                <div>
                  <label className={labelCls}>Full name *</label>
                  <input value={name} onChange={e=>setName(e.target.value)} className={inputCls} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={e=>setAge(e.target.value)}
                      min="13"
                      max="120"
                      step="1"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select value={gender} onChange={e=>setGender(e.target.value)} className={inputCls + ' bg-white dark:bg-white/5'}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
                {locationLoading && <p className="text-xs text-gray-400 dark:text-gray-500">Detecting location…</p>}
                {detectedLocation?.country && (
                  <p className="text-xs text-green-600 dark:text-green-400">📍 Country detected: {detectedLocation.country}</p>
                )}
              </>
            )}

            {/* Organization fields */}
            {userType === 'organization' && (
              <>
                <div>
                  <label className={labelCls}>Organization name *</label>
                  <input value={orgName} onChange={e=>setOrgName(e.target.value)} className={inputCls} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Country *</label>
                    <input value={orgCountry} onChange={e=>setOrgCountry(e.target.value)} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>City *</label>
                    <input value={orgCity} onChange={e=>setOrgCity(e.target.value)} className={inputCls} required />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || !allChecksPassed || usernameAvailable !== true}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
                : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-[rgba(240,240,255,0.3)] mt-6">
            By creating an account you agree to our{' '}
            <Link to="/terms" className="underline hover:text-primary">Terms</Link> and{' '}
            <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}