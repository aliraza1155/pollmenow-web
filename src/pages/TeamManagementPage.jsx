// src/pages/TeamManagementPage.jsx – dark/light mode aware
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { db, functions } from '../lib/firebase';
import {
  collection, doc, onSnapshot, updateDoc, deleteDoc,
  getDoc, serverTimestamp, deleteField,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Users, UserPlus, Trash2, Crown, Shield,
  UserCog, Mail, Check, AlertCircle,
} from 'lucide-react';

const createInvitationCall = httpsCallable(functions, 'createInvitation');

// ── Role config – dark-aware badge colours ────────────────────
const roleConfig = {
  owner: {
    icon:  Crown,
    label: 'Owner',
    lightBg:   'bg-amber-100',   lightText: 'text-amber-800',
    darkBg:    'dark:bg-amber-400/15', darkText: 'dark:text-amber-300',
  },
  admin: {
    icon:  Crown,
    label: 'Admin',
    lightBg:   'bg-amber-50',    lightText: 'text-amber-700',
    darkBg:    'dark:bg-amber-400/10', darkText: 'dark:text-amber-300',
  },
  poll_manager: {
    icon:  UserCog,
    label: 'Poll Manager',
    lightBg:   'bg-blue-50',     lightText: 'text-blue-700',
    darkBg:    'dark:bg-blue-400/12',  darkText: 'dark:text-blue-300',
  },
  analyst: {
    icon:  Shield,
    label: 'Analyst',
    lightBg:   'bg-emerald-50',  lightText: 'text-emerald-700',
    darkBg:    'dark:bg-emerald-400/12', darkText: 'dark:text-emerald-300',
  },
  member: {
    icon:  Users,
    label: 'Member',
    lightBg:   'bg-gray-100',    lightText: 'text-gray-700',
    darkBg:    'dark:bg-white/8',      darkText: 'dark:text-gray-300',
  },
};

// ── Toast ─────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg max-w-sm ${
        type === 'success'
          ? 'bg-green-50 dark:bg-green-400/12 border border-green-200 dark:border-green-400/25 text-green-800 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-400/12 border border-red-200 dark:border-red-400/25 text-red-800 dark:text-red-300'
      }`}
    >
      {type === 'success'
        ? <Check size={18} className="flex-shrink-0" />
        : <AlertCircle size={18} className="flex-shrink-0" />
      }
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition flex-shrink-0"
      >
        ×
      </button>
    </motion.div>
  );
}

// ── Role badge ────────────────────────────────────────────────
function RoleBadge({ role }) {
  const conf     = roleConfig[role] || roleConfig.member;
  const Icon     = conf.icon;
  const badgeCls = `${conf.lightBg} ${conf.lightText} ${conf.darkBg} ${conf.darkText}`;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badgeCls}`}>
      <Icon size={12} />
      <span>{conf.label}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function TeamManagementPage() {
  const { user }                    = useAuth();
  const { activeAccount }           = useAccount();
  const navigate                    = useNavigate();

  const [members,        setMembers]        = useState([]);
  const [inviteEmail,    setInviteEmail]    = useState('');
  const [inviteRole,     setInviteRole]     = useState('member');
  const [loading,        setLoading]        = useState(true);
  const [inviting,       setInviting]       = useState(false);
  const [toast,          setToast]          = useState(null);
  const [removingId,     setRemovingId]     = useState(null);
  const [changingRoleId, setChangingRoleId] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const orgId    = activeAccount !== 'personal' ? activeAccount : null;
  const isOwner  = orgId ? user?.memberships?.[orgId]?.role === 'owner' : false;
  const isAdmin  = orgId ? (user?.memberships?.[orgId]?.role === 'admin' || isOwner) : false;
  const canEdit  = isAdmin || isOwner;

  // ── Real-time team listener ───────────────────────────────
  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const teamRef  = collection(db, 'organizations', orgId, 'team');
    const unsubscribe = onSnapshot(teamRef, async (snapshot) => {
      const list = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data     = docSnap.data();
          const userDoc  = await getDoc(doc(db, 'users', docSnap.id));
          const userData = userDoc.exists() ? userDoc.data() : null;
          return {
            id:           docSnap.id,
            email:        data.email,
            role:         data.role,
            name:         userData?.name || data.email?.split('@')[0] || 'Unknown',
            profileImage: userData?.profileImage || null,
            addedAt:      data.addedAt?.toDate?.() || new Date(),
          };
        })
      );
      setMembers(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      showToast('Failed to load team members', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orgId, user?.uid]);

  // ── Invite ────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!canEdit)                             { showToast('Only admins and owners can invite members', 'error'); return; }
    if (!inviteEmail.trim())                  { showToast('Please enter an email address', 'error'); return; }
    if (!inviteEmail.includes('@'))           { showToast('Please enter a valid email address', 'error'); return; }
    if (members.some(m => m.email === inviteEmail)) { showToast('This user is already a team member', 'error'); return; }
    setInviting(true);
    try {
      await createInvitationCall({ email: inviteEmail, role: inviteRole, orgId });
      showToast(`Invitation sent to ${inviteEmail}`, 'success');
      setInviteEmail('');
    } catch (err) {
      showToast(err.message || 'Failed to send invitation', 'error');
    } finally { setInviting(false); }
  };

  // ── Remove ────────────────────────────────────────────────
  const handleRemove = async (member) => {
    if (!canEdit)                { showToast('Only admins and owners can remove members', 'error'); return; }
    if (member.role === 'owner') { showToast('Cannot remove the organization owner.', 'error'); return; }
    if (!window.confirm(`Remove ${member.name} from your team?`)) return;
    setRemovingId(member.id);
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'team', member.id));
      await updateDoc(doc(db, 'users', member.id), { [`memberships.${orgId}`]: deleteField() });
      showToast(`${member.name} removed from team`, 'success');
    } catch { showToast('Failed to remove member', 'error'); }
    finally { setRemovingId(null); }
  };

  // ── Role change ───────────────────────────────────────────
  const handleRoleChange = async (memberId, newRole) => {
    if (!canEdit) { showToast('Only admins and owners can change roles', 'error'); return; }
    setChangingRoleId(memberId);
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'team', memberId), { role: newRole });
      await updateDoc(doc(db, 'users', memberId), { [`memberships.${orgId}.role`]: newRole });
      showToast('Role updated successfully', 'success');
    } catch { showToast('Failed to update role', 'error'); }
    finally { setChangingRoleId(null); }
  };

  // ── Shared input class ────────────────────────────────────
  const inputCls = `w-full bg-gray-50 dark:bg-white/5
    border border-gray-200 dark:border-white/12
    text-gray-800 dark:text-gray-200
    placeholder-gray-400 dark:placeholder-gray-500
    rounded-xl px-4 py-2.5 text-sm
    focus:border-primary dark:focus:border-primary
    focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/20
    outline-none transition`;

  const selectCls = `${inputCls} cursor-pointer bg-white dark:bg-[#0f1120]`;

  // ── Guards ────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#08091a] px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-white/6 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users size={32} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-[#f0f0ff] mb-2">Sign in to view team</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">You need to be logged in to access team management.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-5 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition"
        >
          Sign in
        </Link>
      </div>
    </div>
  );

  if (!orgId) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#08091a] px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/15 dark:to-secondary/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown size={32} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#f0f0ff] mb-2">No Organization Selected</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Please switch to an organization account to view its team.</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:opacity-90 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#08091a]">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-gray-200 dark:border-white/15 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Loading team members…</p>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#08091a] py-8 px-4 sm:px-6">
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">
              Team Management
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm pl-14">
            {canEdit
              ? 'Manage your team members, assign roles, and control access.'
              : 'View all members of this organization.'}
          </p>
        </motion.div>

        {/* ── Invite card (admins / owners only) ── */}
        {canEdit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f0f0ff]">
                Invite New Member
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Email input */}
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  className={`${inputCls} pl-9`}
                />
              </div>

              {/* Role selector */}
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className={`${selectCls} sm:w-44`}
              >
                <option value="member">Member</option>
                <option value="poll_manager">Poll Manager</option>
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
              </select>

              {/* Send button */}
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {inviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Inviting…
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Send Invite
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              The user must have a PollMeNow account. They'll receive an email invitation.
            </p>
          </motion.div>
        )}

        {/* ── Members list ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 overflow-hidden mb-6"
        >
          {/* List header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/8 flex justify-between items-center bg-gray-50/50 dark:bg-[#161829]/50">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f0f0ff]">
                Team Members
              </h2>
              <span className="text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/8 px-2 py-0.5 rounded-full">
                {members.length}
              </span>
            </div>
            {!canEdit && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">View only</span>
            )}
          </div>

          {/* Empty state */}
          {members.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/6 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No team members yet</p>
              {canEdit && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Invite your first member using the form above.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/6">
              {members.map((member, idx) => {
                const isCurrentUser = member.id === user.uid;
                const isOwnerMember = member.role === 'owner';

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-white/3 transition"
                  >
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden shadow-sm">
                        {member.profileImage
                          ? <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                          : (member.name?.[0]?.toUpperCase() || 'U')
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          {member.name}
                          {isCurrentUser && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{member.email}</p>
                      </div>
                    </div>

                    {/* Role badge + controls */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Current role badge */}
                      <RoleBadge role={member.role} />

                      {/* Role change dropdown (admins can edit non-owners who aren't themselves) */}
                      {canEdit && !isCurrentUser && !isOwnerMember && (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.id, e.target.value)}
                          disabled={changingRoleId === member.id}
                          className={`px-2 py-1.5 text-sm rounded-lg outline-none transition cursor-pointer disabled:opacity-50
                            bg-white dark:bg-[#161829]
                            border border-gray-200 dark:border-white/12
                            text-gray-700 dark:text-gray-300
                            focus:border-primary dark:focus:border-primary
                            focus:ring-1 focus:ring-primary/20`}
                        >
                          <option value="member">Member</option>
                          <option value="poll_manager">Poll Manager</option>
                          <option value="analyst">Analyst</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}

                      {/* Remove button */}
                      {canEdit && !isCurrentUser && !isOwnerMember && (
                        <button
                          onClick={() => handleRemove(member)}
                          disabled={removingId === member.id}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-400/10 disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingId === member.id
                            ? <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-red-500 dark:border-t-red-400 rounded-full animate-spin" />
                            : <Trash2 size={16} />
                          }
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Role permissions reference ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-[#f0f0ff]">
              Role Permissions
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                Icon: Crown,
                iconCls: 'text-amber-600 dark:text-amber-400',
                role: 'Owner',
                desc: 'Full control – manage everything, delete organization, transfer ownership',
              },
              {
                Icon: Crown,
                iconCls: 'text-amber-500 dark:text-amber-400',
                role: 'Admin',
                desc: 'Full access except delete org – manage members, all polls, billing, settings',
              },
              {
                Icon: UserCog,
                iconCls: 'text-blue-500 dark:text-blue-400',
                role: 'Poll Manager',
                desc: 'Create, edit, delete polls – view basic and advanced analytics',
              },
              {
                Icon: Shield,
                iconCls: 'text-emerald-500 dark:text-emerald-400',
                role: 'Analyst',
                desc: 'View only – polls and analytics (no edits, no poll creation)',
              },
              {
                Icon: Users,
                iconCls: 'text-gray-500 dark:text-gray-400',
                role: 'Member',
                desc: 'Basic access – create own polls, view organization polls (read-only)',
              },
            ].map(item => (
              <div key={item.role} className="flex items-start gap-2.5">
                <item.Icon size={13} className={`${item.iconCls} flex-shrink-0 mt-0.5`} />
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{item.role}:</span>{' '}
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}