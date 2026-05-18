// src/pages/Login.jsx – dark/light mode aware
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'framer-motion';

const FEATURES = [
  'AI-generated polls in under 10 seconds',
  'Real-time results with live analytics',
  'Target specific demographics worldwide',
  '1M+ votes cast on the platform',
];

const AUTH_ERROR_MSGS = {
  'auth/user-not-found':    'No account found with this email.',
  'auth/wrong-password':    'Incorrect password.',
  'auth/invalid-email':     'Invalid email address.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
  'auth/invalid-credential':'Invalid email or password.',
};

// ─── Left panel (dark gradient – identical in both modes) ────
function AuthLeft() {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-[#08091a] p-8 lg:p-12 text-[#f0f0ff] relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1120] via-[#08091a] to-[#0d0a1e] pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#e5184c]/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-primary/20 border border-primary/35 rounded-xl flex items-center justify-center">
            {/* Bar chart icon */}
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
          Welcome back to<br />PollMeNow
        </h2>
        <p className="text-[rgba(240,240,255,0.5)] text-sm lg:text-base mb-10 leading-relaxed">
          Sign in to create polls, track analytics,<br className="hidden lg:block" />
          and engage your audience.
        </p>

        {/* Features */}
        <div className="space-y-3 mb-10">
          {FEATURES.map(f => (
            <div key={f} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs text-secondary flex-shrink-0 mt-0.5">✓</div>
              <span className="text-sm text-[rgba(240,240,255,0.7)]">{f}</span>
            </div>
          ))}
        </div>

        {/* Live poll preview card */}
        <div className="bg-[#0f1120] border border-white/8 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-[rgba(240,240,255,0.45)]">Live · Trending</span>
          </div>
          <p className="text-sm font-semibold mb-4 text-[#f0f0ff]">"What's the most critical feature for 2026?"</p>
          {[
            { label: 'AI Automation', pct: 44, color: '#7c2fff' },
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
export default function Login() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) { navigate('/verify-email', { state: { email, redirect } }); return; }
      navigate(redirect);
    } catch (err) {
      setError(AUTH_ERROR_MSGS[err.code] || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate(redirect);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError('Google sign-in failed.');
    }
  };

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm
    bg-gray-50 dark:bg-white/5
    border border-gray-200 dark:border-white/12
    text-gray-900 dark:text-[#f0f0ff]
    placeholder-gray-400 dark:placeholder-[rgba(240,240,255,0.35)]
    focus:border-primary dark:focus:border-primary
    focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/25
    outline-none transition`;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#08091a]">
      <AuthLeft />

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 bg-white dark:bg-[#08091a]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
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
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              PollMeNow
            </span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">Sign in</h1>
            <p className="text-gray-500 dark:text-[rgba(240,240,255,0.5)] mt-2 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create one free →
              </Link>
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3
              border border-gray-200 dark:border-white/12
              bg-white dark:bg-white/4
              hover:bg-gray-50 dark:hover:bg-white/8
              text-gray-700 dark:text-gray-200
              rounded-xl py-3 px-4 text-sm font-medium transition mb-6"
          >
            <span className="text-lg font-bold text-[#4285F4]">G</span>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-gray-200 dark:border-white/10" />
            <span className="mx-4 text-xs text-gray-400 dark:text-[rgba(240,240,255,0.35)]">or</span>
            <div className="flex-grow border-t border-gray-200 dark:border-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-[rgba(240,240,255,0.45)] uppercase tracking-wide mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-[rgba(240,240,255,0.45)] uppercase tracking-wide">
                  Password
                </label>
                <Link to="/reset-password" className="text-xs text-primary font-semibold hover:underline">
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-400/12 border border-red-200 dark:border-red-400/25 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Footer links */}
          <p className="text-center text-xs text-gray-400 dark:text-[rgba(240,240,255,0.3)] mt-8">
            By signing in you agree to our{' '}
            <Link to="/terms" className="underline hover:text-primary">Terms</Link> and{' '}
            <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}