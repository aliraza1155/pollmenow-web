// src/pages/AcceptInvite.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

const acceptInvitationCall = httpsCallable(functions, 'acceptInvitation');

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const orgId = searchParams.get('orgId');
  const { user, loading: authLoading } = useAuth();
  const { refreshUser } = useAccount();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    // 1. Invalid link (missing parameters)
    if (!email || !orgId) {
      setStatus('invalid');
      return;
    }

    // 2. Still determining authentication state – wait
    if (authLoading) {
      return;
    }

    // 3. User is NOT logged in
    if (!user) {
      // Store invitation details for later (will be used after registration/login)
      sessionStorage.setItem('pendingInvite', JSON.stringify({ email, orgId }));

      // Try to see if an account with this email already exists by checking Firestore? 
      // That would require an extra call. Simpler: send them to /login?email=... 
      // and let the login page redirect to register if needed. But we already have /register?email=
      // However, if the user already has an account but is just logged out, they should go to login.
      // To solve this, we can check if an account exists by calling a cloud function? 
      // But that adds complexity. For a smooth experience, we assume the user knows their status.
      // Most platforms send unregistered users to signup, registered to login.
      // Let's do this: redirect to /login?email=... with a flag that says "you have an invitation".
      // If the user logs in successfully, we can auto‑accept.
      // But we already have logic in the register page that auto‑accepts after registration.
      // For login, we need to also auto‑accept after login. That would require a similar `pendingInvite` 
      // check inside the login page. To keep it simple, let's redirect to /register?email=... 
      // because even if the user already has an account, they can sign in from there.
      // The register page has a "Already have an account? Sign in" link.
      // This is acceptable.
      navigate(`/register?email=${encodeURIComponent(email)}`);
      return;
    }

    // 4. User IS logged in – accept the invitation
    const accept = async () => {
      setStatus('accepting');
      try {
        await acceptInvitationCall({ email, orgId });
        setStatus('success');
        // Refresh user context so the new organization membership appears immediately
        await refreshUser();
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };
    accept();
  }, [email, orgId, user, authLoading, navigate, refreshUser]);

  if (status === 'processing') return <div className="text-center py-20">Loading invitation details...</div>;
  if (status === 'accepting') return <div className="text-center py-20">Accepting invitation...</div>;
  if (status === 'invalid') return <div className="text-center py-20 text-red-500">Invalid invitation link.</div>;
  if (status === 'error') return <div className="text-center py-20 text-red-500">Failed to accept invitation. Please try again or contact support.</div>;
  if (status === 'success') return <div className="text-center py-20 text-green-600">✅ Invitation accepted! Redirecting to dashboard...</div>;
  return null;
}