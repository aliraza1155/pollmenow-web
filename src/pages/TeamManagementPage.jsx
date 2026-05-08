// src/pages/TeamManagementPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { canManageTeam } from '../lib/permissions';
import { Users, UserPlus, Trash2, Crown, Shield, UserCog, Mail, Check, AlertCircle } from 'lucide-react';

const createInvitationCall = httpsCallable(functions, 'createInvitation');

const roleConfig = {
  owner: { icon: Crown, label: 'Owner', color: 'from-amber-600 to-amber-700', bg: 'bg-amber-100', text: 'text-amber-800' },
  admin: { icon: Crown, label: 'Admin', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  poll_manager: { icon: UserCog, label: 'Poll Manager', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  analyst: { icon: Shield, label: 'Analyst', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  member: { icon: Users, label: 'Member', color: 'from-gray-500 to-gray-600', bg: 'bg-gray-100', text: 'text-gray-700' }
};

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
  const accountContext = useAccount();
  const { activeAccount, organizations } = accountContext || { activeAccount: null, organizations: [] };
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [changingRoleId, setChangingRoleId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Get current organization ID from active account
  const orgId = activeAccount !== 'personal' ? activeAccount : null;
  const isOwner = orgId ? user?.memberships?.[orgId]?.role === 'owner' : false;
  const isAdmin = orgId ? (user?.memberships?.[orgId]?.role === 'admin' || isOwner) : false;

  // Fetch team members from the organization's `team` subcollection
  useEffect(() => {
    if (!orgId || (!isAdmin && !isOwner)) {
      setLoading(false);
      return;
    }

    const teamRef = collection(db, 'organizations', orgId, 'team');
    const unsubscribe = onSnapshot(teamRef, async (snapshot) => {
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
      const currentMember = membersList.find(m => m.id === user.uid);
      setUserRole(currentMember?.role || null);
      setLoading(false);
    }, (err) => {
      console.error(err);
      showToast('Failed to load team members', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId, user?.uid, isAdmin, isOwner]);

  const handleInvite = async () => {
    if (!isAdmin && !isOwner) {
      showToast('Only admins and owners can invite members', 'error');
      return;
    }
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
      await createInvitationCall({ email: inviteEmail, role: inviteRole, orgId });
      showToast(`Invitation sent to ${inviteEmail}`, 'success');
      setInviteEmail('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member) => {
    if (!isAdmin && !isOwner) {
      showToast('Only admins and owners can remove members', 'error');
      return;
    }
    if (member.role === 'owner') {
      showToast('Cannot remove the organization owner.', 'error');
      return;
    }
    if (!window.confirm(`Remove ${member.name} from your team?`)) return;
    setRemovingId(member.id);
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'team', member.id));
      // Also remove membership from user document
      const userRef = doc(db, 'users', member.id);
      await updateDoc(userRef, {
        [`memberships.${orgId}`]: deleteField(),
      });
      showToast(`${member.name} removed from team`, 'success');
    } catch (err) {
      showToast('Failed to remove member', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!isAdmin && !isOwner) {
      showToast('Only admins and owners can change roles', 'error');
      return;
    }
    setChangingRoleId(memberId);
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'team', memberId), { role: newRole });
      // Also update membership in user document
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        [`memberships.${orgId}.role`]: newRole,
      });
      showToast(`Role updated successfully`, 'success');
    } catch (err) {
      showToast('Failed to update role', 'error');
    } finally {
      setChangingRoleId(null);
    }
  };

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

  if (!orgId || (!isAdmin && !isOwner)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
          <p className="text-gray-500 mb-6">You need to be an admin or owner of an organization to manage its team.</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition">
            Go to Dashboard
          </Link>
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

  const canInvite = isAdmin || isOwner;

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

        {/* Invite Card – only visible to admins/owners */}
        {canInvite && (
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
              The user must have a PollMeNow account. They'll receive an email notification (test mode – check console).
            </p>
          </motion.div>
        )}

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
            {!canInvite && (
              <span className="text-xs text-gray-500 italic">View only</span>
            )}
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No team members yet</p>
              {canInvite && (
                <p className="text-sm text-gray-400">Invite your first member using the form above.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map((member, idx) => {
                const roleConf = roleConfig[member.role] || roleConfig.member;
                const RoleIcon = roleConf.icon;
                const isCurrentUser = member.id === user.uid;
                const isOwnerMember = member.role === 'owner';
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
                        <p className="font-semibold text-gray-900">
                          {member.name}
                          {isCurrentUser && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-13 sm:ml-0">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleConf.bg} ${roleConf.text}`}>
                        <RoleIcon size={12} />
                        <span>{roleConf.label}</span>
                      </div>
                      {canInvite && !isCurrentUser && !isOwnerMember && (
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
                      )}
                      {canInvite && !isCurrentUser && !isOwnerMember && (
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
                      )}
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
            <div className="flex items-start gap-2"><Crown size={12} className="text-amber-600 shrink-0 mt-0.5" /><span><span className="font-semibold">Owner:</span> Full control – manage everything, delete organization, transfer ownership</span></div>
            <div className="flex items-start gap-2"><Crown size={12} className="text-amber-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Admin:</span> Full access except delete org – manage members, all polls, billing, settings</span></div>
            <div className="flex items-start gap-2"><UserCog size={12} className="text-blue-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Poll Manager:</span> Create, edit, delete polls – view analytics</span></div>
            <div className="flex items-start gap-2"><Shield size={12} className="text-emerald-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Analyst:</span> View only – polls and analytics (no edits)</span></div>
            <div className="flex items-start gap-2"><Users size={12} className="text-gray-500 shrink-0 mt-0.5" /><span><span className="font-semibold">Member:</span> Basic access – create polls (read‑only for others)</span></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}