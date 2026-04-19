// src/pages/TeamManagementPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { hasTeamManagement } from '../lib/tierUtils';
import Card from '../components/Card';
import Button from '../components/Button';

export default function TeamManagementPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user || !hasTeamManagement(user.tier)) return;
    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'organizations', user.uid, 'team');
        const snapshot = await getDocs(membersRef);
        const membersList = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const userDoc = await getDoc(doc(db, 'users', docSnap.id));
          return { id: docSnap.id, email: data.email, role: data.role, name: userDoc.exists() ? userDoc.data().name : data.email };
        }));
        setMembers(membersList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [user]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      // Check if user exists
      const usersQuery = query(collection(db, 'users'), where('email', '==', inviteEmail));
      const userSnap = await getDocs(usersQuery);
      if (userSnap.empty) {
        alert('User not found. They must register first.');
        return;
      }
      const targetUserId = userSnap.docs[0].id;
      const memberRef = doc(db, 'organizations', user.uid, 'team', targetUserId);
      await addDoc(collection(db, 'organizations', user.uid, 'team'), {
        email: inviteEmail,
        role: inviteRole,
        addedAt: serverTimestamp(),
        invitedBy: user.uid,
      });
      // Also add organization to user's list
      await updateDoc(doc(db, 'users', targetUserId), {
        organizations: arrayUnion({ id: user.uid, role: inviteRole }),
      });
      setInviteEmail('');
      alert('Invitation sent');
      // Refresh members
      const snapshot = await getDocs(collection(db, 'organizations', user.uid, 'team'));
      const newMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(newMembers);
    } catch (err) {
      alert('Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (window.confirm('Remove this member?')) {
      await deleteDoc(doc(db, 'organizations', user.uid, 'team', memberId));
      setMembers(prev => prev.filter(m => m.id !== memberId));
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    await updateDoc(doc(db, 'organizations', user.uid, 'team', memberId), { role: newRole });
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };

  if (!hasTeamManagement(user?.tier)) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Team Management</h1>
        <p className="text-gray-500 mb-4">Available for Organization tier only.</p>
        <Link to="/upgrade">
          <Button>Upgrade to Organization</Button>
        </Link>
      </div>
    );
  }

  if (loading) return <div className="text-center py-20">Loading team...</div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Team Management</h1>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Invite Member</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="email"
            placeholder="team@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="border rounded px-3 py-2">
            <option value="member">Member</option>
            <option value="poll_manager">Poll Manager</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
          <Button onClick={handleInvite} loading={inviting}>Invite</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-3">Team Members ({members.length})</h2>
        <div className="space-y-3">
          {members.map(member => (
            <div key={member.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="poll_manager">Poll Manager</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => handleRemove(member.id)} className="text-red-500 text-sm">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

