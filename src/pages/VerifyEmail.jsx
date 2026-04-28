// src/pages/VerifyEmail.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth, db } from '../lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || auth.currentUser?.email || '';
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let interval;
    if (cooldown > 0) {
      interval = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setCooldown(60);
      alert('Verification email resent. Please check your inbox.');
    } catch (err) {
      alert('Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { verified: true });
        alert('Email verified! You can now log in.');
        navigate('/login');
      } else {
        alert('Email not verified yet. Please check your inbox.');
      }
    } catch (err) {
      alert('Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-4xl">📧</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
            <p className="text-gray-600 text-sm mb-6">
              We've sent a verification link to <strong className="text-primary">{email}</strong>.
              <br />
              Please click the link in the email to activate your account.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCheckVerification}
                disabled={checking}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  'I have verified'
                )}
              </button>

              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="w-full bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl border border-gray-200 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : loading
                  ? 'Sending...'
                  : 'Resend email'}
              </button>

              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-primary transition mt-2"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}