// src/pages/AcceptInvite.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

const acceptInvitationCall = httpsCallable(functions, 'acceptInvitation');

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const orgId = searchParams.get('orgId');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!email || !orgId) {
      setStatus('invalid');
      return;
    }
    if (!user) {
      sessionStorage.setItem('pendingInvite', JSON.stringify({ email, orgId }));
      navigate(`/register?email=${encodeURIComponent(email)}`);
      return;
    }
    const accept = async () => {
      try {
        await acceptInvitationCall({ email, orgId });
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };
    accept();
  }, [user, email, orgId, navigate]);

  if (status === 'loading') return <div className="text-center py-20">Processing invitation...</div>;
  if (status === 'invalid') return <div className="text-center py-20">Invalid invitation link.</div>;
  if (status === 'error') return <div className="text-center py-20">Failed to accept. Please try again.</div>;
  return <div className="text-center py-20">✅ Accepted! Redirecting...</div>;
}