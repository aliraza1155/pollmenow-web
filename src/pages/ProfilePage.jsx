// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToFirebaseStorage } from '../lib/upload';
import { getFollowers, getFollowing, isFollowing, followUser, unfollowUser } from '../lib/follow';
import { getMonthlyPollLimit } from '../lib/tierUtils';
import { formatDate, toDate } from '../lib/utils';
import { VerifiedBadge, PremiumBadge, Button, Card } from '../components/UI';
import { BADGES } from '../lib/constants';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const POLL_TYPE_ICONS = {
  quick: '⚡',
  yesno: '✅',
  rating: '⭐',
  comparison: '⚖',
  targeted: '🎯',
  live: '🔴'
};

const Toggle = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${
      value ? 'bg-[#6C5CE7]' : 'bg-gray-200'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        value ? 'translate-x-4' : 'translate-x-0.5'
      } mt-0.5`}
    />
  </button>
);

export default function ProfilePage() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const userId = id || user?.uid;
  const isOwnProfile = user && user.uid === userId;

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
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    city: '',
    country: '',
  });
  const [usernameOk, setUsernameOk] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const updateForm = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  // Load profile data
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!snap.exists()) {
          setProfile(null);
          setLoading(false);
          return;
        }
        const d = snap.data();
        setProfile({ uid: userId, ...d });
        setFormData({
          name: d.name || '',
          username: d.username || '',
          email: d.email || '',
          phone: d.phone || '',
          age: d.age?.toString() || '',
          gender: d.gender || '',
          city: d.location?.city || '',
          country: d.location?.country || '',
        });

        // Gracefully handle permission errors for followers/following
        const [pollsSnap, fols, fing] = await Promise.all([
          getDocs(query(collection(db, 'polls'), where('creator.id', '==', userId), orderBy('createdAt', 'desc'))),
          getFollowers(userId).catch(() => []),
          getFollowing(userId).catch(() => []),
        ]);
        setPolls(pollsSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) })));
        setFollowers(fols);
        setFollowing(fing);

        if (user && user.uid !== userId) {
          setFollowingCreator(await isFollowing(userId, user.uid));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, user]);

  // Username availability check
  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(async () => {
      const newUsername = formData.username.trim();
      if (newUsername.length < 3 || newUsername === profile?.username) {
        setUsernameOk(null);
        return;
      }
      const snap = await getDocs(query(collection(db, 'users'), where('username', '==', newUsername.toLowerCase())));
      setUsernameOk(snap.empty);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, editing, profile?.username]);

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file || !isOwnProfile) return;
    setUploading(true);
    try {
      const url = await uploadToFirebaseStorage(file, `profiles/${userId}`);
      await updateDoc(doc(db, 'users', userId), { profileImage: url, updatedAt: serverTimestamp() });
      setProfile(prev => ({ ...prev, profileImage: url }));
      await refreshUser();
      showToast('success', 'Photo updated!');
    } catch {
      showToast('error', 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
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
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        updatedAt: serverTimestamp(),
      };
      if (profile.type === 'individual') {
        if (formData.age) updates.age = parseInt(formData.age);
        if (formData.gender) updates.gender = formData.gender;
        updates['location.city'] = formData.city.trim() || null;
      } else {
        updates['location.country'] = formData.country.trim() || null;
        updates['location.city'] = formData.city.trim() || null;
      }
      await updateDoc(doc(db, 'users', userId), updates);
      setProfile(prev => ({ ...prev, ...updates }));
      await refreshUser();
      setEditing(false);
      showToast('success', 'Profile updated!');
    } catch {
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
    if (followingLoading) return;
    setFollowingLoading(true);
    try {
      if (followingCreator) {
        await unfollowUser(userId, user.uid);
        setFollowingCreator(false);
        setFollowers(prev => prev.filter(i => i !== user.uid));
      } else {
        await followUser(userId, user.uid);
        setFollowingCreator(true);
        setFollowers(prev => [...prev, user.uid]);
      }
    } catch (err) {
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
    navigator.clipboard.writeText(`🗳️ Vote on this poll: "${question}"\n${url}`);
    showToast('success', 'Link copied!');
  };

  const handleDeletePoll = async (pollId) => {
    if (window.confirm('Delete this poll permanently? This cannot be undone.')) {
      await deleteDoc(doc(db, 'polls', pollId));
      setPolls(prev => prev.filter(p => p.id !== pollId));
      showToast('success', 'Poll deleted');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-[#6C5CE7] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-3">👤</p>
          <p className="text-gray-700 font-semibold">User not found</p>
          <Link to="/explore" className="text-[#6C5CE7] text-sm mt-2 inline-block">
            Browse polls →
          </Link>
        </div>
      </div>
    );
  }

  const monthlyLimit = getMonthlyPollLimit(profile.tier || 'free');
  const usagePct = monthlyLimit === Infinity ? 10 : Math.min(100, ((profile.pollsThisMonth || 0) / monthlyLimit) * 100);
  const isIndividual = profile.type === 'individual';
  const earnedBadges = (profile.badges || []).map(bid => BADGES.find(b => b.id === bid)).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 max-w-sm w-full"
          >
            <div
              className={`rounded-xl px-4 py-3 shadow-lg ${
                toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero banner */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] flex items-center justify-center text-white text-3xl font-bold border-3 border-white shadow-md overflow-hidden">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  (profile.name?.[0] || 'U').toUpperCase()
                )}
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#6C5CE7] rounded-full flex items-center justify-center cursor-pointer shadow-md border-2 border-white text-white text-xs">
                  📷
                  <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>

            {/* Profile info */}
            {!editing ? (
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{profile.name}</h1>
                  {profile.verified && <VerifiedBadge size={18} />}
                  {(profile.tier === 'premium' || profile.tier === 'organization') && <PremiumBadge size={18} />}
                </div>
                <p className="text-gray-500 text-sm">@{profile.username} · {profile.type === 'individual' ? 'Individual' : 'Organization'}</p>
                {(profile.location?.city || profile.location?.country) && (
                  <p className="text-gray-400 text-xs mt-1">📍 {[profile.location?.city, profile.location?.country].filter(Boolean).join(', ')}</p>
                )}
                <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{polls.length}</p>
                    <p className="text-xs text-gray-500">Polls</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{followers.length}</p>
                    <p className="text-xs text-gray-500">Followers</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{following.length}</p>
                    <p className="text-xs text-gray-500">Following</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full name</label>
                    <input
                      className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition"
                      value={formData.name}
                      onChange={e => updateForm('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                    <input
                      className={`w-full px-3 py-2 bg-[#f7f7fb] border rounded-lg focus:ring-1 focus:outline-none transition ${
                        usernameOk === false
                          ? 'border-red-400 focus:border-red-400'
                          : usernameOk === true
                          ? 'border-green-400 focus:border-green-400'
                          : 'border-[#e8e8ee] focus:border-[#6C5CE7]'
                      }`}
                      value={formData.username}
                      onChange={e => updateForm('username', e.target.value)}
                    />
                    {usernameOk === true && <p className="text-green-600 text-xs mt-1">✓ Available</p>}
                    {usernameOk === false && <p className="text-red-500 text-xs mt-1">✗ Taken</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition"
                      value={formData.email}
                      onChange={e => updateForm('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition"
                      value={formData.phone}
                      onChange={e => updateForm('phone', e.target.value)}
                    />
                  </div>
                </div>
                {isIndividual && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition"
                        value={formData.age}
                        onChange={e => updateForm('age', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                      <select
                        className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition cursor-pointer"
                        value={formData.gender}
                        onChange={e => updateForm('gender', e.target.value)}
                      >
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                        <option>Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                      <input
                        className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition"
                        value={formData.city}
                        onChange={e => updateForm('city', e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {!isIndividual && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
                      <input
                        className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition"
                        value={formData.country}
                        onChange={e => updateForm('country', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                      <input
                        className="w-full px-3 py-2 bg-[#f7f7fb] border border-[#e8e8ee] rounded-lg focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none transition"
                        value={formData.city}
                        onChange={e => updateForm('city', e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} loading={saving} size="small">
                    Save changes
                  </Button>
                  <Button onClick={() => setEditing(false)} variant="secondary" size="small">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!editing && (
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {isOwnProfile ? (
                  <>
                    <Button onClick={() => setEditing(true)} variant="secondary" size="small" className="w-full">
                      Edit Profile
                    </Button>
                    <Button href="/upgrade" variant="premium" size="small" className="w-full">
                      ⭐ Upgrade
                    </Button>
                    <Button onClick={handleLogout} variant="danger" size="small" className="w-full">
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleFollow}
                    variant={followingCreator ? 'secondary' : 'primary'}
                    size="small"
                    className="w-full"
                    loading={followingLoading}
                    disabled={followingLoading}
                  >
                    {followingCreator ? '✓ Following' : '+ Follow'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Usage bar (own profile) */}
        {isOwnProfile && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-semibold">Monthly polls</span>
                  <span>{profile.pollsThisMonth || 0} / {monthlyLimit === Infinity ? '∞' : monthlyLimit}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : 'bg-gradient-to-r from-[#6C5CE7] to-[#a855f7]'}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
              {profile.tier === 'free' && (
                <Button href="/upgrade" variant="premium" size="small">
                  Upgrade for unlimited
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Badges section */}
        {earnedBadges.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">🏅 Achievements</h3>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm">{badge.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organization details */}
        {profile.type === 'organization' && profile.organization && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-2">🏢 Organization</h3>
            <p className="font-semibold">{profile.organization.name}</p>
            {profile.organization.tagline && <p className="text-xs text-gray-500 mt-1">{profile.organization.tagline}</p>}
          </div>
        )}

        {/* Tabs - team tab navigates to /team instead of setting tab state */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {['polls', 'achievements', 'about', profile.type === 'organization' ? 'team' : null].filter(Boolean).map(t => (
            <button
              key={t}
              onClick={() => {
                if (t === 'team') {
                  navigate('/team');
                } else {
                  setTab(t);
                }
              }}
              className={`px-4 py-2 text-sm font-medium transition ${
                (t === 'team' ? false : tab === t)
                  ? 'text-[#6C5CE7] border-b-2 border-[#6C5CE7]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'polls' && `(${polls.length})`}
            </button>
          ))}
        </div>

        {/* Polls tab */}
        {tab === 'polls' && (
          <>
            {polls.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                <p className="text-gray-500">No polls yet</p>
                {isOwnProfile && (
                  <Button href="/create" className="mt-4">
                    Create first poll
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {polls.map(poll => (
                  <div key={poll.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-[#f7f7fb] p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl">{POLL_TYPE_ICONS[poll.type] || '🗳'}</span>
                        <span className="text-xs text-gray-500">{poll.totalVotes?.toLocaleString() || 0} votes</span>
                      </div>
                      <p className="font-semibold text-gray-900 line-clamp-2">{poll.question}</p>
                    </div>
                    <div className="p-3 flex justify-between items-center border-t border-gray-100">
                      <span className="text-xs text-gray-400">{formatDate(poll.createdAt)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSharePoll(poll.id, poll.question)}
                          className="text-gray-500 hover:text-[#6C5CE7] transition"
                          title="Share"
                        >
                          🔗
                        </button>
                        {isOwnProfile && (
                          <>
                            <Link to={`/create?edit=${poll.id}`} className="text-gray-500 hover:text-[#6C5CE7]" title="Edit">
                              ✏️
                            </Link>
                            <button
                              onClick={() => handleDeletePoll(poll.id)}
                              className="text-gray-500 hover:text-red-500 transition"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        <Link to={`/poll/${poll.id}`} className="text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-2 py-1 rounded">
                          View →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Achievements tab */}
        {tab === 'achievements' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {earnedBadges.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No badges yet. Keep creating polls and engaging!</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {earnedBadges.map(badge => (
                  <div key={badge.id} className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="font-semibold text-gray-900 text-sm">{badge.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                  </div>
                ))}
              </div>
            )}
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
                { label: 'Polls created', value: profile.pollsCreated || 0 },
                ...(profile.location?.country ? [{ label: 'Country', value: profile.location.country }] : []),
                ...(profile.location?.city ? [{ label: 'City', value: profile.location.city }] : []),
              ].map((row, idx, arr) => (
                <div key={row.label} className={`flex justify-between py-2 ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-medium text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team tab placeholder removed – navigation handled directly */}
      </div>
    </div>
  );
}