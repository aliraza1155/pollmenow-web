// src/pages/TeamManagementPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, getDoc, arrayUnion } from 'firebase/firestore';
import { hasTeamManagement } from '../lib/tierUtils';
import { Users, UserPlus, Trash2, Crown, Shield, UserCog, Mail, X, Check, AlertCircle } from 'lucide-react';

// Role icons and badges
const roleConfig = {
  admin: { icon: Crown, label: 'Admin', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  poll_manager: { icon: UserCog, label: 'Poll Manager', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  analyst: { icon: Shield, label: 'Analyst', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  member: { icon: Users, label: 'Member', color: 'from-gray-500 to-gray-600', bg: 'bg-gray-100', text: 'text-gray-700' }
};

// Toast notification component
const Toast = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
      type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
    }`}
  >
    {type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
    <span className="text-sm font-medium">{message}</span>
    <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600">×</button>
  </motion.div>
);

export default function TeamManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [changingRoleId, setChangingRoleId] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!user || !hasTeamManagement(user.tier)) {
      setLoading(false);
      return;
    }
    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'organizations', user.uid, 'team');
        const snapshot = await getDocs(membersRef);
        const membersList = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const userDoc = await getDoc(doc(db, 'users', docSnap.id));
          const userData = userDoc.exists() ? userDoc.data() : null;
          return {
            id: docSnap.id,
            email: data.email,
            role: data.role,
            name: userData?.name || data.email.split('@')[0],
            profileImage: userData?.profileImage || null,
            addedAt: data.addedAt?.toDate?.() || new Date()
          };
        }));
        setMembers(membersList);
      } catch (err) {
        console.error(err);
        showToast('Failed to load team members', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [user]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('Please enter an email address', 'error');
      return;
    }
    if (!inviteEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (members.some(m => m.email === inviteEmail)) {
      showToast('This user is already a team member', 'error');
      return;
    }
    setInviting(true);
    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', inviteEmail.toLowerCase()));
      const userSnap = await getDocs(usersQuery);
      if (userSnap.empty) {
        showToast('User not found. They must register on PollMeNow first.', 'error');
        return;
      }
      const targetUserId = userSnap.docs[0].id;
      const teamRef = collection(db, 'organizations', user.uid, 'team');
      await addDoc(teamRef, {
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        addedAt: serverTimestamp(),
        invitedBy: user.uid,
      });
      await updateDoc(doc(db, 'users', targetUserId), {
        organizations: arrayUnion({ id: user.uid, role: inviteRole, name: user.displayName || user.email })
      });
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      const userData = userDoc.data();
      setMembers(prev => [{
        id: targetUserId,
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        name: userData?.name || inviteEmail.split('@')[0],
        profileImage: userData?.profileImage || null,
        addedAt: new Date()
      }, ...prev]);
      setInviteEmail('');
      showToast(`Invitation sent to ${inviteEmail}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to invite user', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove ${member.name} from your team?`)) return;
    setRemovingId(member.id);
    try {
      await deleteDoc(doc(db, 'organizations', user.uid, 'team', member.id));
      setMembers(prev => prev.filter(m => m.id !== member.id));
      showToast(`${member.name} removed from team`, 'success');
    } catch (err) {
      showToast('Failed to remove member', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setChangingRoleId(memberId);
    try {
      await updateDoc(doc(db, 'organizations', user.uid, 'team', memberId), { role: newRole });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      showToast(`Role updated successfully`, 'success');
    } catch (err) {
      showToast('Failed to update role', 'error');
    } finally {
      setChangingRoleId(null);
    }
  };

  // Check if user has Organization tier
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to manage team</h2>
          <p className="text-gray-500 mb-6">You need to be logged in to access team management.</p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl font-semibold hover:bg-primary-dark transition">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!hasTeamManagement(user?.tier)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
          <p className="text-gray-500 mb-6">Team management is available for Organization tier only.</p>
          <Link to="/upgrade" className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition">
            Upgrade to Organization
          </Link>
          <p className="text-xs text-gray-400 mt-4">Invite team members, assign roles, and collaborate.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Team Management</h1>
          </div>
          <p className="text-gray-500 text-sm pl-14">Manage your team members, assign roles, and control access.</p>
        </motion.div>

        {/* Invite Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Invite New Member</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white cursor-pointer"
            >
              <option value="member">Member</option>
              <option value="poll_manager">Poll Manager</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Send Invite
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            The user must have a PollMeNow account. They'll receive an email notification.
          </p>
        </motion.div>

        {/* Team Members List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{members.length}</span>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No team members yet</p>
              <p className="text-sm text-gray-400">Invite your first member using the form above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map((member, idx) => {
                const RoleIcon = roleConfig[member.role]?.icon || Users;
                const roleConfigItem = roleConfig[member.role] || roleConfig.member;
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                        {member.profileImage ? (
                          <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          member.name?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-13 sm:ml-0">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleConfigItem.bg} ${roleConfigItem.text}`}>
                        <RoleIcon size={12} />
                        <span>{roleConfigItem.label}</span>
                      </div>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={changingRoleId === member.id}
                        className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white cursor-pointer disabled:opacity-50"
                      >
                        <option value="member">Member</option>
                        <option value="poll_manager">Poll Manager</option>
                        <option value="analyst">Analyst</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={removingId === member.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                        title="Remove member"
                      >
                        {removingId === member.id ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Role description card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">Role Permissions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
            <div className="flex items-start gap-2"><Crown size={12} className="text-amber-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Admin:</span> Full access – manage members, all polls, billing, settings</span></div>
            <div className="flex items-start gap-2"><UserCog size={12} className="text-blue-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Poll Manager:</span> Create, edit, delete polls – view analytics</span></div>
            <div className="flex items-start gap-2"><Shield size={12} className="text-emerald-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Analyst:</span> View only – polls and analytics (no edits)</span></div>
            <div className="flex items-start gap-2"><Users size={12} className="text-gray-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Member:</span> Basic access – create polls (read‑only for others)</span></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}