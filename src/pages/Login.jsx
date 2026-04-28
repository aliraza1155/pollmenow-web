// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
  'auth/invalid-credential': 'Invalid email or password.',
};

function AuthLeft() {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-primary via-secondary to-pink-500 p-8 lg:p-12 text-white">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl font-bold">P</div>
        <span className="text-xl font-bold tracking-tight">PollMeNow</span>
      </div>
      <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-3">
        Welcome back to PollMeNow
      </h2>
      <p className="text-white/80 text-sm lg:text-base mb-8">
        Sign in to create polls, track analytics, and engage your audience.
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Panel - Only visible on large screens */}
      <AuthLeft />

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Sign in</h1>
            <p className="text-gray-500 mt-2">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create one free →
              </Link>
            </p>
          </div>

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 text-gray-700 font-medium hover:bg-gray-50 transition mb-6"
          >
            <span className="text-lg font-bold">G</span> Continue with Google
          </button>

          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-4 text-xs text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Password
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}