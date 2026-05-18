// src/pages/ProfilePage.jsx – dark/light mode aware
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { db, auth } from '../lib/firebase';
import {
  doc, getDoc, getDocs, updateDoc, collection, query, where,
  deleteDoc, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { uploadToFirebaseStorage } from '../lib/upload';
import { getFollowers, getFollowing, isFollowing, followUser, unfollowUser } from '../lib/follow';
import { getMonthlyPollLimit } from '../lib/tierUtils';
import { formatDate, toDate } from '../lib/utils';
import { VerifiedBadge, PremiumBadge, Button } from '../components/UI';
import { BADGES } from '../lib/constants';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', live:'🔴' };

// ── Shared input class ──
const inputCls = `w-full px-3 py-2 rounded-lg text-sm
  bg-gray-50 dark:bg-white/5
  border border-gray-200 dark:border-white/12
  text-gray-800 dark:text-gray-200
  placeholder-gray-400 dark:placeholder-gray-500
  focus:border-primary dark:focus:border-primary
  focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary/20
  outline-none transition`;

export default function ProfilePage() {
  const { id }    = useParams();
  const { user, refreshUser } = useAuth();
  const { activeAccount, organizations, refreshActiveOrganization } = useAccount();
  const navigate  = useNavigate();

  const isFriendProfile        = !!id && id !== user?.uid;
  const showOrganizationProfile = !isFriendProfile && activeAccount !== 'personal';
  const targetUserId = isFriendProfile ? id : (showOrganizationProfile ? activeAccount : user?.uid);

  const [profile,          setProfile]          = useState(null);
  const [polls,            setPolls]            = useState([]);
  const [followers,        setFollowers]        = useState([]);
  const [following,        setFollowing]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [tab,              setTab]              = useState('polls');
  const [editing,          setEditing]          = useState(false);
  const [uploading,        setUploading]        = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [followingCreator, setFollowingCreator] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [toast,            setToast]            = useState(null);
  const [formData,         setFormData]         = useState({});
  const [usernameOk,       setUsernameOk]       = useState(null);
  const pollsUnsubRef = useRef(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const updateForm = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  // ── Load profile ──
  useEffect(() => {
    if (pollsUnsubRef.current) { pollsUnsubRef.current(); pollsUnsubRef.current = null; }
    const load = async () => {
      setLoading(true);
      try {
        if (!targetUserId) { setLoading(false); return; }
        const snap = await getDoc(doc(db, 'users', targetUserId));
        if (!snap.exists()) { setProfile(null); setLoading(false); return; }
        const d = snap.data();
        setProfile({ uid: targetUserId, ...d });
        setFormData({
          name: d.name || '', username: d.username || '', email: d.email || '',
          phone: d.phone || '', age: d.age?.toString() || '', gender: d.gender || '',
          city: d.location?.city || '', country: d.location?.country || '',
          description: d.description || '', logo: d.profileImage || null,
        });
        if (d.type !== 'organization') {
          const [fols, fing] = await Promise.all([
            getFollowers(targetUserId).catch(() => []),
            getFollowing(targetUserId).catch(() => []),
          ]);
          setFollowers(fols); setFollowing(fing);
        } else { setFollowers([]); setFollowing([]); }
        if (user && user.uid !== targetUserId) setFollowingCreator(await isFollowing(targetUserId, user.uid).catch(() => false));

        // Polls listener
        const pollsQuery = showOrganizationProfile && d.type === 'organization'
          ? query(collection(db,'polls'), where('context.type','==','organization'), where('context.orgId','==',targetUserId))
          : query(collection(db,'polls'), where('creator.id','==',targetUserId));
        const unsub = onSnapshot(pollsQuery, snap => {
          const data = snap.docs.map(d => ({ id:d.id, ...d.data(), createdAt: d.data().createdAt ? toDate(d.data().createdAt) : new Date() }));
          data.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
          setPolls(data);
        }, err => showToast('error', 'Failed to load polls: '+err.message));
        pollsUnsubRef.current = unsub;
      } catch (err) { showToast('error', 'Failed to load profile'); }
      finally { setLoading(false); }
    };
    if (targetUserId) load();
    else setLoading(false);
    return () => { if (pollsUnsubRef.current) { pollsUnsubRef.current(); pollsUnsubRef.current = null; } };
  }, [targetUserId, showOrganizationProfile, user]);

  // ── Username check ──
  useEffect(() => {
    if (!editing || isFriendProfile) return;
    const timer = setTimeout(async () => {
      const uname = (formData.username || '').trim();
      if (uname.length < 3 || uname === profile?.username) { setUsernameOk(null); return; }
      try {
        const snap = await getDocs(query(collection(db,'users'), where('username','==',uname.toLowerCase())));
        setUsernameOk(snap.empty);
      } catch { setUsernameOk(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, editing, profile?.username, isFriendProfile]);

  const handleAvatar = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToFirebaseStorage(file, `profiles/${targetUserId}`);
      await updateDoc(doc(db,'users',targetUserId), { profileImage: url, updatedAt: serverTimestamp() });
      setProfile(prev => ({ ...prev, profileImage: url }));
      await refreshUser();
      showToast('success', 'Photo updated!');
    } catch { showToast('error', 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (isFriendProfile || !targetUserId) return;
    if (formData.username !== profile?.username && !usernameOk) { showToast('error', 'Username not available.'); return; }
    if (formData.phone && !parsePhoneNumberFromString(formData.phone)?.isValid()) { showToast('error', 'Invalid phone number.'); return; }
    setSaving(true);
    try {
      const updates = {
        name:     (formData.name     || '').trim(),
        username: (formData.username || '').trim().toLowerCase(),
        email:    (formData.email    || '').trim(),
        phone:    (formData.phone    || '').trim() || null,
        updatedAt: serverTimestamp(),
      };
      if (profile.type === 'individual') {
        if (formData.age)    updates.age = parseInt(formData.age);
        if (formData.gender) updates.gender = formData.gender;
        updates['location.city'] = (formData.city || '').trim() || null;
      } else {
        updates['location.country'] = (formData.country || '').trim() || null;
        updates['location.city']    = (formData.city    || '').trim() || null;
        updates.description = (formData.description || '').trim() || null;
        updates.profileImage = formData.logo || null;
      }
      await updateDoc(doc(db,'users',targetUserId), updates);
      setProfile(prev => ({ ...prev, ...updates }));
      await refreshUser(); setEditing(false);
      showToast('success', 'Profile updated!');
    } catch { showToast('error', 'Update failed.'); }
    finally { setSaving(false); }
  };

  const handleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    if (!isFriendProfile) return;
    setFollowingLoading(true);
    try {
      if (followingCreator) { await unfollowUser(targetUserId, user.uid); setFollowingCreator(false); setFollowers(p=>p.filter(i=>i!==user.uid)); }
      else                  { await followUser(targetUserId, user.uid);   setFollowingCreator(true);  setFollowers(p=>[...p,user.uid]); }
    } catch (err) { showToast('error', err.message); }
    finally { setFollowingLoading(false); }
  };

  const handleSharePoll = (pollId, question) => {
    navigator.clipboard.writeText(`🗳️ Vote on this poll: "${question}"\n${window.location.origin}/poll/${pollId}`).catch(()=>{});
    showToast('success', 'Link copied!');
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll permanently?')) return;
    try { await deleteDoc(doc(db,'polls',pollId)); showToast('success','Poll deleted'); }
    catch { showToast('error','Failed to delete poll.'); }
  };

  // ── Derived ──
  const isOwnProfile = !!user && !isFriendProfile && targetUserId === user.uid;
  const monthlyLimit = getMonthlyPollLimit(profile?.tier || 'free');
  const usagePct     = monthlyLimit === Infinity ? 10 : Math.min(100, ((profile?.pollsThisMonth || 0) / monthlyLimit) * 100);
  const earnedBadges = (profile?.badges || []).map(bid => BADGES.find(b => b.id === bid)).filter(Boolean);
  const showTeamTab  = showOrganizationProfile && user && user.memberships?.[activeAccount] != null;
  const tabs = ['polls', ...(profile?.type !== 'organization' ? ['achievements','about'] : ['about']), ...(showTeamTab ? ['team'] : [])];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#08091a]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#08091a]">
      <div className="text-center">
        <p className="text-5xl mb-3">👤</p>
        <p className="text-gray-700 dark:text-gray-300 font-semibold">Profile not found</p>
        <Link to="/explore" className="text-primary text-sm mt-2 inline-block">Browse polls →</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#08091a]">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-20 }} className="fixed top-20 right-4 z-50 max-w-sm w-full">
            <div className={`rounded-xl px-4 py-3 shadow-lg ${toast.type==='success' ? 'bg-green-50 dark:bg-green-400/12 border border-green-200 dark:border-green-400/25 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-400/12 border border-red-200 dark:border-red-400/25 text-red-800 dark:text-red-300'}`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* ── Hero card ── */}
        <div className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

            {/* Avatar */}
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold border-3 border-white dark:border-[#0f1120] shadow-md overflow-hidden">
                {profile.profileImage
                  ? <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                  : (profile.name?.[0] || 'U').toUpperCase()
                }
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md border-2 border-white dark:border-[#0f1120] text-white text-xs">
                  📷
                  <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>

            {/* Info / edit form */}
            {!editing ? (
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#f0f0ff]">{profile.name}</h1>
                  {profile.verified && <VerifiedBadge size={18} />}
                  {(profile.tier === 'premium' || profile.tier === 'organization') && <PremiumBadge size={18} />}
                  {showOrganizationProfile && profile.type === 'organization' && (
                    <span className="text-xs font-semibold bg-primary/10 dark:bg-primary/15 text-primary px-2 py-0.5 rounded-full">Organization</span>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">@{profile.username} · {profile.type === 'individual' ? 'Individual' : 'Organization'}</p>
                {(profile.location?.city || profile.location?.country) && (
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">📍 {[profile.location?.city, profile.location?.country].filter(Boolean).join(', ')}</p>
                )}
                {profile.description && <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{profile.description}</p>}
                <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4">
                  <div><p className="text-xl font-bold text-gray-900 dark:text-[#f0f0ff]">{polls.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Polls</p></div>
                  {profile.type !== 'organization' && (
                    <>
                      <div><p className="text-xl font-bold text-gray-900 dark:text-[#f0f0ff]">{followers.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Followers</p></div>
                      <div><p className="text-xl font-bold text-gray-900 dark:text-[#f0f0ff]">{following.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Following</p></div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Edit form */
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Name</label><input className={inputCls} value={formData.name||''} onChange={e=>updateForm('name',e.target.value)} /></div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Username</label>
                    <input className={`${inputCls} ${usernameOk===false?'border-red-400 dark:border-red-400/60':usernameOk===true?'border-green-400 dark:border-green-400/60':''}`} value={formData.username||''} onChange={e=>updateForm('username',e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email</label><input type="email" className={inputCls} value={formData.email||''} onChange={e=>updateForm('email',e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Phone</label><input type="tel" className={inputCls} value={formData.phone||''} onChange={e=>updateForm('phone',e.target.value)} /></div>
                </div>
                {profile.type === 'individual' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Age</label><input type="number" className={inputCls} value={formData.age||''} onChange={e=>updateForm('age',e.target.value)} /></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Gender</label>
                      <select className={inputCls} value={formData.gender||''} onChange={e=>updateForm('gender',e.target.value)}>
                        <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">City</label><input className={inputCls} value={formData.city||''} onChange={e=>updateForm('city',e.target.value)} /></div>
                  </div>
                )}
                {profile.type === 'organization' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Country</label><input className={inputCls} value={formData.country||''} onChange={e=>updateForm('country',e.target.value)} /></div>
                      <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">City</label><input className={inputCls} value={formData.city||''} onChange={e=>updateForm('city',e.target.value)} /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label><textarea className={inputCls} rows={3} value={formData.description||''} onChange={e=>updateForm('description',e.target.value)} /></div>
                  </>
                )}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} loading={saving} size="small">Save changes</Button>
                  <Button onClick={() => setEditing(false)} variant="secondary" size="small">Cancel</Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!editing && (
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {isOwnProfile ? (
                  <>
                    <Button onClick={() => setEditing(true)} variant="secondary" size="small" className="w-full">Edit Profile</Button>
                    <Link to="/upgrade" className="w-full">
                      <Button variant="premium" size="small" className="w-full">⭐ Upgrade</Button>
                    </Link>
                    <Button onClick={() => { auth.signOut(); navigate('/'); }} variant="danger" size="small" className="w-full">Logout</Button>
                  </>
                ) : isFriendProfile && profile.type !== 'organization' && (
                  <Button
                    onClick={handleFollow}
                    variant={followingCreator ? 'secondary' : 'primary'}
                    size="small" className="w-full"
                    loading={followingLoading} disabled={followingLoading}
                  >
                    {followingCreator ? '✓ Following' : '+ Follow'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Monthly usage bar (own personal profile) */}
        {isOwnProfile && profile.type === 'individual' && (
          <div className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 p-4 mb-6">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-semibold">Monthly polls</span>
              <span>{profile.pollsThisMonth || 0} / {monthlyLimit === Infinity ? '∞' : monthlyLimit}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : 'bg-gradient-to-r from-primary to-secondary'}`} style={{ width: `${usagePct}%` }} />
            </div>
            {profile.tier === 'free' && (
              <Link to="/upgrade">
                <Button variant="premium" size="small" className="mt-2">Upgrade for unlimited</Button>
              </Link>
            )}
          </div>
        )}

        {/* Badges quick strip */}
        {profile.type === 'individual' && earnedBadges.length > 0 && (
          <div className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-[#f0f0ff] mb-3">🏅 Achievements</h3>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map(b => (
                <div key={b.id} className="flex items-center gap-1 bg-gray-100 dark:bg-white/8 rounded-full px-3 py-1">
                  <span className="text-sm">{b.icon}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-white/10 mb-6">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { if (t === 'team') navigate('/team'); else setTab(t); }}
              className={`px-4 py-2 text-sm font-medium transition ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {t.charAt(0).toUpperCase()+t.slice(1)}{t === 'polls' && ` (${polls.length})`}
            </button>
          ))}
        </div>

        {/* ── Polls tab ── */}
        {tab === 'polls' && (
          polls.length === 0 ? (
            <div className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No polls found</p>
              {isOwnProfile && <Link to="/create" className="inline-block mt-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 py-2 text-sm font-bold shadow">Create first poll</Link>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {polls.map(poll => {
                const canModify = isOwnProfile;
                return (
                  <div key={poll.id} className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 overflow-hidden hover:shadow-md dark:hover:shadow-black/30 transition">
                    <div className="bg-gray-50 dark:bg-[#161829] p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl">{POLL_TYPE_ICONS[poll.type] || '🗳'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{(poll.totalVotes||0).toLocaleString()} votes</span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{poll.question}</p>
                    </div>
                    <div className="p-3 flex justify-between items-center border-t border-gray-100 dark:border-white/6">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(poll.createdAt)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleSharePoll(poll.id, poll.question)} className="text-gray-500 dark:text-gray-400 hover:text-primary transition">🔗</button>
                        {canModify && <Link to={`/create?edit=${poll.id}`} className="text-gray-500 dark:text-gray-400 hover:text-primary transition">✏️</Link>}
                        {canModify && <button onClick={() => handleDeletePoll(poll.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition">🗑️</button>}
                        <Link to={`/poll/${poll.id}`} className="text-xs font-semibold text-primary bg-primary/10 dark:bg-primary/15 px-2 py-1 rounded hover:bg-primary/20 transition">View →</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Achievements tab ── */}
        {tab === 'achievements' && profile.type === 'individual' && (
          <div className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 p-6">
            {earnedBadges.length === 0
              ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">No badges yet. Keep creating polls!</p>
              : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {earnedBadges.map(b => (
                    <div key={b.id} className="text-center p-4 bg-gray-50 dark:bg-white/4 rounded-xl border border-gray-100 dark:border-white/6">
                      <div className="text-3xl mb-2">{b.icon}</div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{b.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.description}</p>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── About tab ── */}
        {tab === 'about' && (
          <div className="bg-white dark:bg-[#0f1120] rounded-2xl shadow-sm border border-gray-100 dark:border-white/8 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#f0f0ff] mb-4">About {profile.name}</h3>
            <div className="space-y-3">
              {[
                { label: 'Account type', value: profile.type === 'individual' ? 'Individual' : 'Organization' },
                { label: 'Tier',         value: (profile.tier||'free').charAt(0).toUpperCase()+(profile.tier||'free').slice(1) },
                { label: 'Joined',       value: formatDate(toDate(profile.createdAt)) },
                { label: 'Polls',        value: polls.length },
                { label: 'Email',        value: profile.email || 'Not provided' },
                { label: 'Phone',        value: profile.phone || 'Not provided' },
                ...(profile.location?.country ? [{ label:'Country', value: profile.location.country }] : []),
                ...(profile.location?.city    ? [{ label:'City',    value: profile.location.city    }] : []),
                ...(profile.description       ? [{ label:'Bio',     value: profile.description      }] : []),
              ].map((row, idx, arr) => (
                <div key={row.label} className={`flex justify-between py-2 ${idx !== arr.length-1 ? 'border-b border-gray-100 dark:border-white/6' : ''}`}>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}