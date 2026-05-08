// src/pages/AcceptInvite.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

const acceptInvitationCall = httpsCallable(functions, 'acceptInvitation');

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const orgId = searchParams.get('orgId');
  const { user, loading: authLoading } = useAuth();
  const { refreshUser } = useAccount();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token || !orgId) {
      setStatus('invalid');
      return;
    }
    if (authLoading) return;
    setStatus('ready');
  }, [token, orgId, authLoading, user]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptInvitationCall({ token, orgId });
      await refreshUser(); // attempts to update state

      // Force a hard reload to ensure the navbar's account switcher picks up the new membership
      window.location.href = '/dashboard';
      // No need to call navigate or setStatus after reload
    } catch (err) {
      console.error(err);
      setStatus('error');
      setAccepting(false);
    }
  };

  const handleLoginRedirect = () => {
    sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
    navigate('/login');
  };

  if (status === 'loading') return <div className="text-center py-20">Loading invitation...</div>;
  if (status === 'invalid') return <div className="text-center py-20 text-red-500">Invalid invitation link.</div>;

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Accept Invitation</h2>
          <p className="text-gray-600 mb-6">
            You need to sign in to accept this invitation. If you don’t have an account, you can create one first.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={handleLoginRedirect} className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark">
              Sign in
            </button>
            <Link to={`/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="border border-primary text-primary px-6 py-2 rounded-lg font-semibold hover:bg-primary/10">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User is logged in, show accept button
  if (status === 'error') {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4">Failed to accept invitation. Please try again.</div>
        <button onClick={handleAccept} className="bg-primary text-white px-6 py-2 rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Accept Invitation</h2>
        <p className="text-gray-600 mb-6">You have been invited to join an organization on PollMeNow.</p>
        <button onClick={handleAccept} disabled={accepting} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50">
          {accepting ? 'Accepting...' : 'Accept Invitation'}
        </button>
      </div>
    </div>
  );
}