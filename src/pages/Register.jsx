// src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';
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

function AuthLeft() {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-primary via-secondary to-pink-500 p-8 lg:p-12 text-white">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl font-bold">P</div>
        <span className="text-xl font-bold tracking-tight">PollMeNow</span>
      </div>
      <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-3">
        Join PollMeNow
      </h2>
      <p className="text-white/80 text-sm lg:text-base mb-8">
        Start creating polls, gather insights, and grow your audience.
      </p>
      <div className="space-y-3">
        {FEATURES.map(f => (
          <div key={f} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs mt-0.5">✓</div>
            <span className="text-sm text-white/90">{f}</span>
          </div>
        ))}
      </div>
      <div className="mt-10 bg-white/10 backdrop-blur rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span className="text-xs font-bold uppercase tracking-wide">Live · Trending</span>
        </div>
        <p className="text-sm font-semibold mb-3">"What's the most critical feature for 2026?"</p>
        {[
          { label: 'AI Automation', pct: 44 },
          { label: 'Privacy Control', pct: 30 },
          { label: 'Cross-Platform', pct: 26 },
        ].map(bar => (
          <div key={bar.label} className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>{bar.label}</span>
              <span className="font-bold">{bar.pct}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${bar.pct}%` }} />
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

  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <AuthLeft />

      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
            <p className="text-gray-500 mt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign in →
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account type toggle */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUserType('individual')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition ${
                  userType === 'individual'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setUserType('organization')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition ${
                  userType === 'organization'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Organization
              </button>
            </div>

            {/* Common fields */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Username *
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                required
              />
              {username.length >= 3 && (
                <p
                  className={`text-xs mt-1 ${
                    usernameAvailable === true
                      ? 'text-green-600'
                      : usernameAvailable === false
                      ? 'text-red-500'
                      : 'text-gray-400'
                  }`}
                >
                  {checkingUsername
                    ? 'Checking...'
                    : usernameAvailable === true
                    ? '✓ Available'
                    : usernameAvailable === false
                    ? '✗ Taken'
                    : ''}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                required
              />
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                <span className={passwordChecks.length ? 'text-green-600' : 'text-gray-400'}>
                  ✓ 8+ chars
                </span>
                <span className={passwordChecks.upper ? 'text-green-600' : 'text-gray-400'}>
                  ✓ Uppercase
                </span>
                <span className={passwordChecks.lower ? 'text-green-600' : 'text-gray-400'}>
                  ✓ Lowercase
                </span>
                <span className={passwordChecks.number ? 'text-green-600' : 'text-gray-400'}>
                  ✓ Number
                </span>
                <span className={passwordChecks.special ? 'text-green-600' : 'text-gray-400'}>
                  ✓ Special
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              />
            </div>

            {/* Individual fields */}
            {userType === 'individual' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Full name *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-white"
                    >
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {locationLoading && (
                  <p className="text-xs text-gray-400">Detecting location...</p>
                )}
                {detectedLocation?.country && (
                  <p className="text-xs text-green-600">
                    📍 Country detected: {detectedLocation.country}
                  </p>
                )}
              </>
            )}

            {/* Organization fields */}
            {userType === 'organization' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Organization name *
                  </label>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Country *
                    </label>
                    <input
                      value={orgCountry}
                      onChange={(e) => setOrgCountry(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      City *
                    </label>
                    <input
                      value={orgCity}
                      onChange={(e) => setOrgCity(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || !allChecksPassed || usernameAvailable !== true}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}