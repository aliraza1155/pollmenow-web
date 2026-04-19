// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToFirebaseStorage } from '../lib/upload';
import { getFollowers, getFollowing, isFollowing, followUser, unfollowUser } from '../lib/follow';
import { getMonthlyPollLimit } from '../lib/tierUtils';
import { formatDate, toDate } from '../lib/utils';
import { VerifiedBadge, PremiumBadge } from '../components/UI';
import { BADGES } from '../lib/constants';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', targeted:'🎯', live:'🔴' };

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : '#e8e8ee', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </div>
  );
}

export default function ProfilePage() {
  const { id }  = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const userId       = id || user?.uid;
  const isOwnProfile = user && user.uid === userId;

  const [profile,      setProfile]     = useState(null);
  const [polls,        setPolls]       = useState([]);
  const [followers,    setFollowers]   = useState([]);
  const [following,    setFollowing]   = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [tab,          setTab]         = useState('polls');
  const [editing,      setEditing]     = useState(false);
  const [uploading,    setUploading]   = useState(false);
  const [saving,       setSaving]      = useState(false);
  const [followingCreator, setFollowingCreator] = useState(false);
  const [toast,        setToast]       = useState(null);
  const [formData,     setFormData]    = useState({ name:'', username:'', email:'', phone:'', age:'', gender:'', city:'', country:'' });
  const [usernameOk,   setUsernameOk]  = useState(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const F = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!snap.exists()) { setProfile(null); setLoading(false); return; }
        const d = snap.data();
        setProfile({ uid: userId, ...d });
        setFormData({ name: d.name||'', username: d.username||'', email: d.email||'', phone: d.phone||'', age: d.age?.toString()||'', gender: d.gender||'', city: d.location?.city||'', country: d.location?.country||'' });

        const [pollsSnap, fols, fing] = await Promise.all([
          getDocs(query(collection(db, 'polls'), where('creator.id','==',userId), orderBy('createdAt','desc'))),
          getFollowers(userId),
          getFollowing(userId),
        ]);
        setPolls(pollsSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) })));
        setFollowers(fols);
        setFollowing(fing);

        if (user && user.uid !== userId) {
          setFollowingCreator(await isFollowing(userId, user.uid));
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [userId, user]);

  // Username availability check
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(async () => {
      if (formData.username.trim().length < 3 || formData.username === profile?.username) { setUsernameOk(null); return; }
      const snap = await getDocs(query(collection(db, 'users'), where('username','==',formData.username.trim().toLowerCase())));
      setUsernameOk(snap.empty);
    }, 500);
    return () => clearTimeout(t);
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
    } catch { showToast('error', 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (formData.username !== profile?.username && !usernameOk) { showToast('error', 'Username not available.'); return; }
    if (formData.phone && !parsePhoneNumberFromString(formData.phone)?.isValid()) { showToast('error', 'Invalid phone number.'); return; }
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
        updates['location.city']    = formData.city.trim()    || null;
      }
      await updateDoc(doc(db, 'users', userId), updates);
      setProfile(prev => ({ ...prev, ...updates }));
      await refreshUser();
      setEditing(false);
      showToast('success', 'Profile updated!');
    } catch { showToast('error', 'Update failed.'); }
    finally { setSaving(false); }
  };

  const handleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      if (followingCreator) { await unfollowUser(userId, user.uid); setFollowingCreator(false); setFollowers(prev => prev.filter(i => i !== user.uid)); }
      else { await followUser(userId, user.uid); setFollowingCreator(true); setFollowers(prev => [...prev, user.uid]); }
    } catch (err) { showToast('error', err.message); }
  };

  const handleLogout = async () => { await auth.signOut(); navigate('/'); };

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

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#9898a8' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e8e8ee', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Loading...
    </div>
  );
  if (!profile) return <div style={{ textAlign: 'center', padding: '80px 20px', fontSize: 16, color: '#9898a8' }}>User not found.</div>;

  const monthlyLimit = getMonthlyPollLimit(profile.tier || 'free');
  const usagePct     = monthlyLimit === Infinity ? 10 : Math.min(100, ((profile.pollsThisMonth || 0) / monthlyLimit) * 100);
  const isIndividual = profile.type === 'individual';
  const earnedBadges = (profile.badges || []).map(bid => BADGES.find(b => b.id === bid)).filter(Boolean);

  const inputStyle = { width: '100%', background: '#f7f7fb', border: '1px solid #e8e8ee', borderRadius: 9, padding: '10px 13px', fontSize: 14, color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 76, right: 20, zIndex: 999, background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: toast.type === 'success' ? '#14532d' : '#7f1d1d', borderRadius: 12, padding: '12px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.1)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Hero banner */}
        <div style={{ background: 'linear-gradient(135deg,#f0eeff 0%,#faf5ff 100%)', border: '1px solid #ddd6fe', borderRadius: 20, padding: '28px', marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 800, border: '3px solid #fff', boxShadow: '0 4px 16px rgba(108,92,231,.25)', overflow: 'hidden' }}>
              {profile.profileImage
                ? <img src={profile.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (profile.name?.[0] || 'U').toUpperCase()
              }
            </div>
            {isOwnProfile && (
              <label style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: '#6C5CE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)', border: '2px solid #fff', fontSize: 12 }}>
                📷
                <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} disabled={uploading} />
              </label>
            )}
          </div>

          {/* Info */}
          {!editing ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: 0 }}>{profile.name}</h1>
                {profile.verified && <VerifiedBadge size={18} />}
                {(profile.tier === 'premium' || profile.tier === 'organization') && <PremiumBadge size={18} />}
              </div>
              <p style={{ fontSize: 13, color: '#9898a8', margin: '0 0 10px' }}>@{profile.username} · {profile.type === 'individual' ? 'Individual' : 'Organization'}</p>
              {(profile.location?.city || profile.location?.country) && (
                <p style={{ fontSize: 12, color: '#9898a8', margin: '0 0 14px' }}>📍 {[profile.location?.city, profile.location?.country].filter(Boolean).join(', ')}</p>
              )}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[{ val: polls.length, lbl: 'Polls' }, { val: followers.length, lbl: 'Followers' }, { val: following.length, lbl: 'Following' }].map(s => (
                  <div key={s.lbl} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>{s.val}</p>
                    <p style={{ fontSize: 11, color: '#9898a8', margin: 0 }}>{s.lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>Full name</label><input style={inputStyle} value={formData.name} onChange={e => F('name', e.target.value)} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>Username</label><input style={{ ...inputStyle, borderColor: usernameOk === false ? '#fca5a5' : usernameOk === true ? '#86efac' : '#e8e8ee' }} value={formData.username} onChange={e => F('username', e.target.value)} />
                {usernameOk === true  && <p style={{ fontSize: 10, color: '#22c55e', margin: '3px 0 0' }}>✓ Available</p>}
                {usernameOk === false && <p style={{ fontSize: 10, color: '#ef4444', margin: '3px 0 0' }}>✗ Taken</p>}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>Email</label><input style={inputStyle} value={formData.email} onChange={e => F('email', e.target.value)} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>Phone</label><input style={inputStyle} placeholder="+1234567890" value={formData.phone} onChange={e => F('phone', e.target.value)} /></div>
              </div>
              {isIndividual && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>Age</label><input style={inputStyle} type="number" value={formData.age} onChange={e => F('age', e.target.value)} /></div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>Gender</label><select style={{ ...inputStyle, cursor: 'pointer' }} value={formData.gender} onChange={e => F('gender', e.target.value)}><option value="">Select</option>{['Male','Female','Other','Prefer not to say'].map(g => <option key={g}>{g}</option>)}</select></div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>City</label><input style={inputStyle} value={formData.city} onChange={e => F('city', e.target.value)} /></div>
                </div>
              )}
              {!isIndividual && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>Country</label><input style={inputStyle} value={formData.country} onChange={e => F('country', e.target.value)} /></div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: '#9898a8', display: 'block', marginBottom: 4 }}>City</label><input style={inputStyle} value={formData.city} onChange={e => F('city', e.target.value)} /></div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save changes'}</button>
                <button onClick={() => setEditing(false)} style={{ background: '#f4f4f6', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#6b6b7b' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!editing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              {isOwnProfile ? (
                <>
                  <button onClick={() => setEditing(true)} style={{ border: '1.5px solid #6C5CE7', background: 'transparent', color: '#6C5CE7', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Edit Profile</button>
                  <Link to="/upgrade" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>⭐ Upgrade</Link>
                  <button onClick={handleLogout} style={{ border: '1px solid #fecaca', background: '#fff', color: '#ef4444', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Logout</button>
                </>
              ) : (
                <button onClick={handleFollow} style={{ borderRadius: 20, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: followingCreator ? '#f0eeff' : 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: followingCreator ? '#6C5CE7' : '#fff' }}>
                  {followingCreator ? '✓ Following' : '+ Follow'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Usage bar (own profile) */}
        {isOwnProfile && (
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9898a8', marginBottom: 6, fontWeight: 600 }}>
                <span>Monthly polls</span>
                <span>{profile.pollsThisMonth || 0} / {monthlyLimit === Infinity ? '∞' : monthlyLimit}</span>
              </div>
              <div style={{ height: 5, background: '#f0f0f5', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${usagePct}%`, background: usagePct >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6C5CE7,#a855f7)', borderRadius: 99 }} />
              </div>
            </div>
            {profile.tier === 'free' && (
              <Link to="/upgrade" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>Upgrade for unlimited</Link>
            )}
          </div>
        )}

        {/* Badges section */}
        {earnedBadges.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>🏅 Achievements</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {earnedBadges.map(badge => (
                <div key={badge.id} style={{ background: '#f0f0f5', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{badge.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organization details */}
        {profile.type === 'organization' && profile.organization && (
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 8 }}>🏢 Organization</p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{profile.organization.name}</p>
            {profile.organization.tagline && <p style={{ fontSize: 12, color: '#9898a8' }}>{profile.organization.tagline}</p>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--pmn-border)', marginBottom: 20 }}>
          <button onClick={() => setTab('polls')} style={{ padding: '10px 18px', fontSize: 13, fontWeight: tab === 'polls' ? 700 : 500, color: tab === 'polls' ? '#6C5CE7' : '#9898a8', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === 'polls' ? '#6C5CE7' : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>Polls ({polls.length})</button>
          <button onClick={() => setTab('achievements')} style={{ padding: '10px 18px', fontSize: 13, fontWeight: tab === 'achievements' ? 700 : 500, color: tab === 'achievements' ? '#6C5CE7' : '#9898a8', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === 'achievements' ? '#6C5CE7' : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>Achievements</button>
          <button onClick={() => setTab('about')} style={{ padding: '10px 18px', fontSize: 13, fontWeight: tab === 'about' ? 700 : 500, color: tab === 'about' ? '#6C5CE7' : '#9898a8', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === 'about' ? '#6C5CE7' : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>About</button>
          {profile.type === 'organization' && (
            <button onClick={() => setTab('team')} style={{ padding: '10px 18px', fontSize: 13, fontWeight: tab === 'team' ? 700 : 500, color: tab === 'team' ? '#6C5CE7' : '#9898a8', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === 'team' ? '#6C5CE7' : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>Team</button>
          )}
        </div>

        {/* Polls tab */}
        {tab === 'polls' && (
          polls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid var(--pmn-border)' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#6b6b7b' }}>No polls yet</p>
              {isOwnProfile && <Link to="/create" style={{ display: 'inline-block', marginTop: 14, background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Create first poll</Link>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {polls.map(poll => (
                <div key={poll.id} style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ background: '#f7f7fb', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>{POLL_TYPE_ICONS[poll.type] || '🗳'}</span>
                      <span style={{ fontSize: 11, color: '#9898a8' }}>{poll.totalVotes?.toLocaleString() || 0} votes</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{poll.question}</p>
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f5' }}>
                    <span style={{ fontSize: 11, color: '#9898a8' }}>{formatDate(poll.createdAt)}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleSharePoll(poll.id, poll.question)} style={{ background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', color: '#6b6b7b' }} title="Share">🔗</button>
                      {isOwnProfile && (
                        <>
                          <Link to={`/create?edit=${poll.id}`} style={{ textDecoration: 'none', fontSize: 14, color: '#6b6b7b' }} title="Edit">✏️</Link>
                          <button onClick={() => handleDeletePoll(poll.id)} style={{ background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', color: '#ef4444' }} title="Delete">🗑️</button>
                        </>
                      )}
                      <Link to={`/poll/${poll.id}`} style={{ fontSize: 11, fontWeight: 700, color: '#6C5CE7', textDecoration: 'none', background: '#f0eeff', borderRadius: 7, padding: '4px 10px' }}>View →</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Achievements tab */}
        {tab === 'achievements' && (
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '24px' }}>
            {earnedBadges.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9898a8' }}>No badges yet. Keep creating polls and engaging!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
                {earnedBadges.map(badge => (
                  <div key={badge.id} style={{ textAlign: 'center', padding: 12, background: '#fafafa', borderRadius: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{badge.icon}</div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0 }}>{badge.name}</p>
                    <p style={{ fontSize: 10, color: '#9898a8', marginTop: 4 }}>{badge.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About tab */}
        {tab === 'about' && (
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '24px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 16 }}>About {profile.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Account type', value: profile.type === 'individual' ? 'Individual' : 'Organization' },
                { label: 'Tier',         value: (profile.tier || 'free').charAt(0).toUpperCase() + (profile.tier || 'free').slice(1) },
                { label: 'Joined',       value: formatDate(toDate(profile.createdAt)) },
                { label: 'Polls created',value: profile.pollsCreated || 0 },
                ...(profile.location?.country ? [{ label: 'Country', value: profile.location.country }] : []),
                ...(profile.location?.city    ? [{ label: 'City',    value: profile.location.city    }] : []),
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid #f4f4f6' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#9898a8' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team tab (placeholder – you can implement full team management later) */}
        {tab === 'team' && profile.type === 'organization' && (
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
            <p style={{ color: '#9898a8' }}>Team management coming soon.</p>
            <Link to="/team" style={{ color: '#6C5CE7', fontWeight: 600 }}>Manage team →</Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .profile-hero { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}