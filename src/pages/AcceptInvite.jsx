// src/pages/AcceptInvite.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, setDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[AcceptInvite]', ...args);
}

export default function AcceptInvite() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get('id');
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      sessionStorage.setItem('pendingInvite', inviteId);
      navigate('/login');
      return;
    }
    if (!inviteId) {
      setStatus('error');
      setMessage('No invitation ID provided.');
      return;
    }

    const accept = async () => {
      try {
        const inviteRef = doc(db, 'invites', inviteId);
        const inviteSnap = await getDoc(inviteRef);
        if (!inviteSnap.exists()) {
          setStatus('invalid');
          setMessage('This invitation does not exist.');
          return;
        }
        const invite = inviteSnap.data();
        log('Invite data:', invite);

        if (invite.status !== 'pending') {
          setStatus('already_used');
          setMessage(`This invitation has already been ${invite.status}.`);
          return;
        }
        if (invite.expiresAt?.toDate() < new Date()) {
          setStatus('expired');
          setMessage('This invitation has expired.');
          return;
        }
        if (invite.email !== user.email) {
          setStatus('error');
          setMessage('This invitation was sent to a different email address. Please log in with the correct account.');
          return;
        }

        // Add organization to user's organizations array
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const currentOrgs = userSnap.data()?.organizations || [];
        const alreadyMember = currentOrgs.some(o => o.id === invite.organizationId);
        if (!alreadyMember) {
          await updateDoc(userRef, {
            organizations: arrayUnion({
              id: invite.organizationId,
              role: invite.role,
              name: invite.organizationName,
              addedAt: serverTimestamp(),
            })
          });
          log('Added organization to user');
        }

        // Add user to organization's team subcollection (if not already)
        const teamRef = doc(db, 'organizations', invite.organizationId, 'team', user.uid);
        const teamSnap = await getDoc(teamRef);
        if (!teamSnap.exists()) {
          await setDoc(teamRef, {
            email: user.email,
            role: invite.role,
            addedAt: serverTimestamp(),
            invitedBy: invite.invitedBy,
          });
          log('Added user to organization team');
        }

        // Mark invite as accepted
        await updateDoc(inviteRef, { status: 'accepted' });
        setStatus('success');
        setMessage(`You are now a member of ${invite.organizationName}.`);
        await refreshUser();
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        console.error(err);
        setStatus('error');
        setMessage('An error occurred while accepting the invitation.');
      }
    };
    accept();
  }, [user, authLoading, inviteId, navigate, refreshUser]);

  if (authLoading || status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Processing invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
        {status === 'success' && <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />}
        {(status === 'error' || status === 'invalid' || status === 'expired' || status === 'already_used') && <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'success' ? 'Invitation Accepted' : 'Invitation Failed'}
        </h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <button onClick={() => navigate('/dashboard')} className="bg-primary text-white px-6 py-2 rounded-xl font-semibold hover:bg-primary-dark transition">Go to Dashboard</button>
      </div>
    </div>
  );
}