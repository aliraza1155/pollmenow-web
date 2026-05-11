// src/pages/ProfilePage.jsx – Final version with team tab visible to all members
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { db, auth } from '../lib/firebase';
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { uploadToFirebaseStorage } from '../lib/upload';
import { getFollowers, getFollowing, isFollowing, followUser, unfollowUser } from '../lib/follow';
import { getMonthlyPollLimit } from '../lib/tierUtils';
import { formatDate, toDate } from '../lib/utils';
import { VerifiedBadge, PremiumBadge, Button } from '../components/UI';
import { BADGES } from '../lib/constants';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { canEditOrgProfile } from '../lib/permissions';

const POLL_TYPE_ICONS = {
  quick: '⚡',
  yesno: '✅',
  rating: '⭐',
  comparison: '⚖',
  live: '🔴',
};

export default function ProfilePage() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const { activeAccount, organizations, refreshActiveOrganization } = useAccount();
  const navigate = useNavigate();

  // Log initial state
  console.log('[ProfilePage] 🚀 Component mounted');
  console.log('[ProfilePage] URL param id:', id);
  console.log('[ProfilePage] Current auth user:', user?.uid, user?.type);
  console.log('[ProfilePage] Active account:', activeAccount);

  // Determine what we are viewing
  const isFriendProfile = !!id && id !== user?.uid;
  const showOrganizationProfile = !isFriendProfile && activeAccount !== 'personal';
  // For organization mode, we load the user document of the organization
  const targetUserId = isFriendProfile ? id : (showOrganizationProfile ? activeAccount : user?.uid);

  console.log('[ProfilePage] isFriendProfile:', isFriendProfile);
  console.log('[ProfilePage] showOrganizationProfile:', showOrganizationProfile);
  console.log('[ProfilePage] targetUserId:', targetUserId);

  const [profile, setProfile] = useState(null);
  const [polls, setPolls] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('polls');
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followingCreator, setFollowingCreator] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({});
  const [usernameOk, setUsernameOk] = useState(null);

  const pollsUnsubscribeRef = useRef(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const updateForm = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  // ========================== LOAD PROFILE ==========================
  useEffect(() => {
    if (pollsUnsubscribeRef.current) {
      console.log('[ProfilePage] Cleaning up previous polls listener');
      pollsUnsubscribeRef.current();
      pollsUnsubscribeRef.current = null;
    }

    const load = async () => {
      setLoading(true);
      console.log('[ProfilePage] Starting load for targetUserId:', targetUserId);
      try {
        if (targetUserId) {
          // Always load from users collection
          console.log(`[ProfilePage] 🔍 Fetching user document for: ${targetUserId}`);
          const userSnap = await getDoc(doc(db, 'users', targetUserId));
          if (!userSnap.exists()) {
            console.error('[ProfilePage] ❌ User document not found');
            setProfile(null);
            setLoading(false);
            return;
          }
          const d = userSnap.data();
          console.log('[ProfilePage] ✅ User document loaded:', { 
            uid: targetUserId, 
            name: d.name, 
            type: d.type, 
            tier: d.tier,
            pollsCreated: d.pollsCreated,
            email: d.email 
          });
          setProfile({ uid: targetUserId, ...d });
          setFormData({
            name: d.name || '',
            username: d.username || '',
            email: d.email || '',
            phone: d.phone || '',
            age: d.age?.toString() || '',
            gender: d.gender || '',
            city: d.location?.city || '',
            country: d.location?.country || '',
            description: d.description || '',
            logo: d.profileImage || null,
          });

          // Fetch followers/following only for individual profiles
          if (d.type !== 'organization') {
            console.log('[ProfilePage] Fetching followers/following for individual user');
            const [fols, fing] = await Promise.all([
              getFollowers(targetUserId).catch(() => []),
              getFollowing(targetUserId).catch(() => []),
            ]);
            setFollowers(fols);
            setFollowing(fing);
            console.log(`[ProfilePage] Followers: ${fols.length}, Following: ${fing.length}`);
          } else {
            console.log('[ProfilePage] Skipping followers/following for organization account');
            setFollowers([]);
            setFollowing([]);
          }

          if (user && user.uid !== targetUserId) {
            console.log('[ProfilePage] Checking follow status for friend profile');
            setFollowingCreator(await isFollowing(targetUserId, user.uid).catch(() => false));
            console.log('[ProfilePage] Following creator:', followingCreator);
          }

          // ========== AUTO‑REPAIR MISSING CONTEXT ON POLLS (only for organization owner) ==========
          if (d.type === 'organization' && user && user.uid === targetUserId) {
            console.log('[ProfilePage] 🔧 Running auto-repair for organization polls (owner only)');
            const pollsQuery = query(collection(db, 'polls'), where('creator.id', '==', targetUserId));
            const snap = await getDocs(pollsQuery);
            let updatedCount = 0;
            for (const pollDoc of snap.docs) {
              const poll = pollDoc.data();
              // If poll is missing context or context.type is not 'organization', add it
              if (!poll.context || poll.context.type !== 'organization') {
                console.log(`[ProfilePage] Repairing poll ${pollDoc.id} - adding context`);
                await updateDoc(doc(db, 'polls', pollDoc.id), {
                  context: {
                    type: 'organization',
                    orgId: targetUserId,
                  },
                });
                updatedCount++;
              }
            }
            if (updatedCount > 0) {
              console.log(`[ProfilePage] ✅ Repaired ${updatedCount} polls with missing context`);
            } else {
              console.log('[ProfilePage] No polls needed repair');
            }
          }

          // Polls query based on mode
          let pollsQuery;
          if (showOrganizationProfile && d.type === 'organization') {
            console.log(`[ProfilePage] 📊 Setting up organization polls listener for orgId: ${targetUserId}`);
            pollsQuery = query(
              collection(db, 'polls'),
              where('context.type', '==', 'organization'),
              where('context.orgId', '==', targetUserId)
            );
          } else {
            console.log(`[ProfilePage] 📊 Setting up personal polls listener for creator.id: ${targetUserId}`);
            pollsQuery = query(collection(db, 'polls'), where('creator.id', '==', targetUserId));
          }
          const unsubscribe = onSnapshot(pollsQuery, (snapshot) => {
            const pollsData = snapshot.docs.map(d => ({
              id: d.id,
              ...d.data(),
              createdAt: d.data().createdAt ? toDate(d.data().createdAt) : new Date(),
            }));
            pollsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            console.log(`[ProfilePage] 📊 Polls listener updated: ${pollsData.length} polls found`);
            setPolls(pollsData);
          }, (err) => {
            console.error('[ProfilePage] 🔴 Polls listener error:', err);
            showToast('error', 'Failed to load polls: ' + err.message);
          });
          pollsUnsubscribeRef.current = unsubscribe;
        }
      } catch (err) {
        console.error('[ProfilePage] 🔴 Load error:', err);
        showToast('error', 'Failed to load profile');
      } finally {
        setLoading(false);
        console.log('[ProfilePage] Loading finished');
      }
    };

    if (targetUserId) {
      load();
    } else {
      console.log('[ProfilePage] No targetUserId, skipping load');
      setLoading(false);
    }

    return () => {
      if (pollsUnsubscribeRef.current) {
        console.log('[ProfilePage] Cleanup: unsubscribing polls listener');
        pollsUnsubscribeRef.current();
        pollsUnsubscribeRef.current = null;
      }
    };
  }, [targetUserId, showOrganizationProfile, user]);

  // ======================== USERNAME AVAILABILITY ========================
  useEffect(() => {
    if (!editing || isFriendProfile) return;
    const timer = setTimeout(async () => {
      const newUsername = (formData.username || '').trim();
      if (newUsername.length < 3 || newUsername === profile?.username) {
        setUsernameOk(null);
        return;
      }
      try {
        const q = query(collection(db, 'users'), where('username', '==', newUsername.toLowerCase()));
        const snap = await getDocs(q);
        setUsernameOk(snap.empty);
        console.log(`[ProfilePage] Username check: ${newUsername} available: ${snap.empty}`);
      } catch (err) {
        console.error('[ProfilePage] Username check error:', err);
        setUsernameOk(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, editing, profile?.username, isFriendProfile]);

  // ======================== HANDLERS ========================

  const handleAvatar = async (e) => {
    if (isFriendProfile || !isOwnProfile) return;
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToFirebaseStorage(file, `profiles/${targetUserId}`);
      await updateDoc(doc(db, 'users', targetUserId), { profileImage: url, updatedAt: serverTimestamp() });
      setProfile(prev => ({ ...prev, profileImage: url }));
      await refreshUser();
      showToast('success', 'Photo updated!');
      console.log('[ProfilePage] Avatar updated successfully');
    } catch (err) {
      console.error('[ProfilePage] Avatar upload error:', err);
      showToast('error', 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (isFriendProfile || !targetUserId) return;
    if (formData.username !== profile?.username && !usernameOk) {
      showToast('error', 'Username not available.');
      return;
    }
    if (formData.phone && !parsePhoneNumberFromString(formData.phone)?.isValid()) {
      showToast('error', 'Invalid phone number.');
      return;
    }
    setSaving(true);
    try {
      const updates = {
        name: (formData.name || '').trim(),
        username: (formData.username || '').trim().toLowerCase(),
        email: (formData.email || '').trim(),
        phone: (formData.phone || '').trim() || null,
        updatedAt: serverTimestamp(),
      };
      if (profile.type === 'individual') {
        if (formData.age) updates.age = parseInt(formData.age);
        if (formData.gender) updates.gender = formData.gender;
        updates['location.city'] = (formData.city || '').trim() || null;
      } else {
        // Organization user – update location, description, and logo
        updates['location.country'] = (formData.country || '').trim() || null;
        updates['location.city'] = (formData.city || '').trim() || null;
        updates.description = (formData.description || '').trim() || null;
        updates.profileImage = formData.logo || null;
      }
      console.log('[ProfilePage] Saving profile updates:', updates);
      await updateDoc(doc(db, 'users', targetUserId), updates);
      setProfile(prev => ({ ...prev, ...updates }));
      await refreshUser();
      setEditing(false);
      showToast('success', 'Profile updated!');
      console.log('[ProfilePage] Profile saved successfully');
    } catch (err) {
      console.error('[ProfilePage] Save error:', err);
      showToast('error', 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isFriendProfile) return;
    setFollowingLoading(true);
    try {
      if (followingCreator) {
        console.log(`[ProfilePage] Unfollowing user ${targetUserId}`);
        await unfollowUser(targetUserId, user.uid);
        setFollowingCreator(false);
        setFollowers(prev => prev.filter(i => i !== user.uid));
      } else {
        console.log(`[ProfilePage] Following user ${targetUserId}`);
        await followUser(targetUserId, user.uid);
        setFollowingCreator(true);
        setFollowers(prev => [...prev, user.uid]);
      }
    } catch (err) {
      console.error('[ProfilePage] Follow error:', err);
      showToast('error', err.message);
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const handleSharePoll = (pollId, question) => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(`🗳️ Vote on this poll: "${question}"\n${url}`).catch(() => {});
    showToast('success', 'Link copied!');
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll permanently? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'polls', pollId));
      showToast('success', 'Poll deleted');
    } catch {
      showToast('error', 'Failed to delete poll.');
    }
  };

  // ======================== DERIVED ========================
  const isOwnProfile = !!user && !isFriendProfile && targetUserId === user.uid;
  const canEdit = isOwnProfile;
  const monthlyLimit = getMonthlyPollLimit(profile?.tier || 'free');
  const usagePct = monthlyLimit === Infinity ? 10 : Math.min(100, ((profile?.pollsThisMonth || 0) / monthlyLimit) * 100);
  const earnedBadges = (profile?.badges || []).map(bid => BADGES.find(b => b.id === bid)).filter(Boolean);
  
  // ✅ Updated: Team tab visible to any member of the organization (not only admin/owner)
  const showTeamTab = showOrganizationProfile && user && user.memberships?.[activeAccount] != null;

  // Build tabs based on profile type
  const tabs = ['polls'];
  if (profile?.type !== 'organization') tabs.push('achievements', 'about');
  if (profile?.type === 'organization') tabs.push('about');
  if (showTeamTab) tabs.push('team');

  // ======================== RENDER ========================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-3">👤</p>
          <p className="text-gray-700 font-semibold">Profile not found</p>
          <Link to="/explore" className="text-primary text-sm mt-2 inline-block">Browse polls →</Link>
        </div>
      </div>
    );
  }

  console.log('[ProfilePage] Rendering profile:', { name: profile.name, type: profile.type, pollsCount: polls.length });

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 max-w-sm w-full"
          >
            <div className={`rounded-xl px-4 py-3 shadow-lg ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold border-3 border-white shadow-md overflow-hidden">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  (profile.name?.[0] || 'U').toUpperCase()
                )}
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md border-2 border-white text-white text-xs">
                  📷
                  <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>

            {!editing ? (
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{profile.name}</h1>
                  {profile.verified && <VerifiedBadge size={18} />}
                  {(profile.tier === 'premium' || profile.tier === 'organization') && <PremiumBadge size={18} />}
                  {showOrganizationProfile && profile.type === 'organization' && (
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Organization</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">@{profile.username} · {profile.type === 'individual' ? 'Individual' : 'Organization'}</p>
                {(profile.location?.city || profile.location?.country) && (
                  <p className="text-gray-400 text-xs mt-1">📍 {[profile.location?.city, profile.location?.country].filter(Boolean).join(', ')}</p>
                )}
                {profile.description && (
                  <p className="text-gray-600 text-sm mt-2">{profile.description}</p>
                )}
                <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4">
                  <div><p className="text-xl font-bold text-gray-900">{polls.length}</p><p className="text-xs text-gray-500">Polls</p></div>
                  {profile.type !== 'organization' && (
                    <>
                      <div><p className="text-xl font-bold text-gray-900">{followers.length}</p><p className="text-xs text-gray-500">Followers</p></div>
                      <div><p className="text-xl font-bold text-gray-900">{following.length}</p><p className="text-xs text-gray-500">Following</p></div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // Edit form
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label><input className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.name || ''} onChange={e => updateForm('name', e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label><input className={`w-full px-3 py-2 bg-gray-50 border rounded-lg ${usernameOk === false ? 'border-red-400' : usernameOk === true ? 'border-green-400' : 'border-gray-200'}`} value={formData.username || ''} onChange={e => updateForm('username', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input type="email" className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.email || ''} onChange={e => updateForm('email', e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label><input type="tel" className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.phone || ''} onChange={e => updateForm('phone', e.target.value)} /></div>
                </div>
                {profile.type === 'individual' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label><input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.age || ''} onChange={e => updateForm('age', e.target.value)} /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label><select className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.gender || ''} onChange={e => updateForm('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label><input className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.city || ''} onChange={e => updateForm('city', e.target.value)} /></div>
                  </div>
                )}
                {profile.type === 'organization' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label><input className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.country || ''} onChange={e => updateForm('country', e.target.value)} /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label><input className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={formData.city || ''} onChange={e => updateForm('city', e.target.value)} /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label><textarea className="w-full px-3 py-2 bg-gray-50 border rounded-lg" rows={3} value={formData.description || ''} onChange={e => updateForm('description', e.target.value)} /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logo</label><div className="flex items-center gap-2">{formData.logo && <img src={formData.logo} className="w-10 h-10 rounded-full object-cover" />}<input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files[0]; if (!file) return; const url = await uploadToFirebaseStorage(file, `profiles/${targetUserId}`); updateForm('logo', url); }} className="text-sm" /></div></div>
                  </>
                )}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} loading={saving} size="small">Save changes</Button>
                  <Button onClick={() => setEditing(false)} variant="secondary" size="small">Cancel</Button>
                </div>
              </div>
            )}

            {!editing && (
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {isOwnProfile ? (
                  <>
                    <Button onClick={() => setEditing(true)} variant="secondary" size="small" className="w-full">Edit Profile</Button>
                    <Button href="/upgrade" variant="premium" size="small" className="w-full">⭐ Upgrade</Button>
                    <Button onClick={handleLogout} variant="danger" size="small" className="w-full">Logout</Button>
                  </>
                ) : !isFriendProfile && profile.type !== 'organization' && (
                  <Button onClick={handleFollow} variant={followingCreator ? 'secondary' : 'primary'} size="small" className="w-full" loading={followingLoading} disabled={followingLoading}>
                    {followingCreator ? '✓ Following' : '+ Follow'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Monthly usage (personal own only) */}
        {isOwnProfile && profile.type === 'individual' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-semibold">Monthly polls</span>
              <span>{profile.pollsThisMonth || 0} / {monthlyLimit === Infinity ? '∞' : monthlyLimit}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : 'bg-gradient-to-r from-primary to-secondary'}`} style={{ width: `${usagePct}%` }} />
            </div>
            {profile.tier === 'free' && (
              <Button href="/upgrade" variant="premium" size="small" className="mt-2">Upgrade for unlimited</Button>
            )}
          </div>
        )}

        {/* Achievements (personal only) */}
        {profile.type === 'individual' && earnedBadges.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">🏅 Achievements</h3>
            <div className="flex flex-wrap gap-2">{earnedBadges.map(badge => (<div key={badge.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1"><span className="text-sm">{badge.icon}</span><span className="text-xs font-medium text-gray-700">{badge.name}</span></div>))}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { if (t === 'team') navigate('/team'); else setTab(t); }}
              className={`px-4 py-2 text-sm font-medium transition ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'polls' && ` (${polls.length})`}
            </button>
          ))}
        </div>

        {/* Polls tab */}
        {tab === 'polls' && (
          polls.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
              <p className="text-gray-500">No polls found</p>
              {isOwnProfile && <Link to="/create" className="inline-block mt-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 py-2 text-sm font-bold shadow">Create first poll</Link>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {polls.map(poll => {
                const canModify = isOwnProfile;
                return (
                  <div key={poll.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-4">
                      <div className="flex justify-between items-start mb-2"><span className="text-2xl">{POLL_TYPE_ICONS[poll.type] || '🗳'}</span><span className="text-xs text-gray-500">{(poll.totalVotes || 0).toLocaleString()} votes</span></div>
                      <p className="font-semibold text-gray-900 line-clamp-2">{poll.question}</p>
                    </div>
                    <div className="p-3 flex justify-between items-center border-t border-gray-100">
                      <span className="text-xs text-gray-400">{formatDate(poll.createdAt)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleSharePoll(poll.id, poll.question)} className="text-gray-500 hover:text-primary">🔗</button>
                        {canModify && <Link to={`/create?edit=${poll.id}`} className="text-gray-500 hover:text-primary">✏️</Link>}
                        {canModify && <button onClick={() => handleDeletePoll(poll.id)} className="text-gray-500 hover:text-red-500">🗑️</button>}
                        <Link to={`/poll/${poll.id}`} className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">View →</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Achievements tab (personal only) */}
        {tab === 'achievements' && profile.type === 'individual' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {earnedBadges.length === 0 ? <p className="text-center text-gray-500 py-8">No badges yet. Keep creating polls!</p> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{earnedBadges.map(badge => (<div key={badge.id} className="text-center p-4 bg-gray-50 rounded-xl"><div className="text-3xl mb-2">{badge.icon}</div><p className="font-semibold text-gray-900 text-sm">{badge.name}</p><p className="text-xs text-gray-500 mt-1">{badge.description}</p></div>))}</div>}
          </div>
        )}

        {/* About tab */}
        {tab === 'about' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">About {profile.name}</h3>
            <div className="space-y-3">
              {[
                { label: 'Account type', value: profile.type === 'individual' ? 'Individual' : 'Organization' },
                { label: 'Tier', value: (profile.tier || 'free').charAt(0).toUpperCase() + (profile.tier || 'free').slice(1) },
                { label: 'Joined', value: formatDate(toDate(profile.createdAt)) },
                { label: 'Polls', value: polls.length },
                { label: 'Email', value: profile.email || 'Not provided' },
                { label: 'Phone', value: profile.phone || 'Not provided' },
                ...(profile.location?.country ? [{ label: 'Country', value: profile.location.country }] : []),
                ...(profile.location?.city ? [{ label: 'City', value: profile.location.city }] : []),
                ...(profile.description ? [{ label: 'Description', value: profile.description }] : []),
              ].map((row, idx, arr) => (
                <div key={row.label} className={`flex justify-between py-2 ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-medium text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}