// src/pages/UpgradeSuccess.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function UpgradeSuccess() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const upgrade = async () => {
      await refreshUser();
      setTimeout(() => navigate('/dashboard'), 2000);
    };
    upgrade();
  }, [refreshUser, navigate]);

  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful! 🎉</h1>
      <p>Your account is being upgraded. Redirecting to dashboard...</p>
    </div>
  );
}