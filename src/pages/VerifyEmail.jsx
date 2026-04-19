// src/pages/VerifyEmail.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Card from '../components/Card';

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
        // Update Firestore
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
    <div className="max-w-md mx-auto py-16 px-4">
      <Card>
        <div className="text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
          <p className="text-gray-600 mb-4">
            We've sent a verification link to <strong>{email}</strong>.
            Please click the link in the email to activate your account.
          </p>
          <div className="space-y-3">
            <Button onClick={handleCheckVerification} loading={checking} className="w-full">
              I have verified
            </Button>
            <Button onClick={handleResend} loading={loading} disabled={cooldown > 0} variant="secondary" className="w-full">
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
            </Button>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:underline">
              Use a different email
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

