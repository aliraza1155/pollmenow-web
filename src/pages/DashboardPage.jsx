// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getUserVotes } from '../lib/vote';
import { getMonthlyPollLimit, hasPremiumAnalytics } from '../lib/tierUtils';
import { formatDate, toDate } from '../lib/utils';

/* ─── tiny helpers ─────────────────────────────────────── */
const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', targeted:'🎯', live:'🔴' };
const STATUS_COLOR    = { active: '#22c55e', ended: '#9898a8', draft: '#f59e0b' };

function StatCard({ icon, value, label, sub, color = '#6C5CE7' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#9898a8', margin: 0 }}>{sub}</p>}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [myPolls,   setMyPolls]   = useState([]);
  const [votes,     setVotes]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('polls'); // polls | votes | notifications
  const [deleting,  setDeleting]  = useState(null);
  const [toast,     setToast]     = useState(null);
  const [filter,    setFilter]    = useState('all'); // all | active | ended

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [pollsSnap] = await Promise.all([
          getDocs(query(collection(db, 'polls'), where('creator.id','==',user.uid), orderBy('createdAt','desc'))),
        ]);
        setMyPolls(pollsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            question:   data.question   || '',
            type:       data.type       || 'quick',
            totalVotes: data.totalVotes || 0,
            visibility: data.visibility || 'public',
            createdAt:  toDate(data.createdAt) || new Date(),
            endsAt:     data.endsAt ? toDate(data.endsAt) : null,
            meta:       data.meta || {},
            accessCode: data.accessCode,
          };
        }));

        const userVotes = await getUserVotes(user.uid).catch(() => []);
        setVotes(userVotes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleDelete = async (pollId) => {
    if (!window.confirm('Delete this poll? This cannot be undone.')) return;
    setDeleting(pollId);
    try {
      await deleteDoc(doc(db, 'polls', pollId));
      setMyPolls(prev => prev.filter(p => p.id !== pollId));
      showToast('success', 'Poll deleted.');
    } catch { showToast('error', 'Delete failed.'); }
    finally { setDeleting(null); }
  };

  if (!user) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 18, fontWeight: 700 }}>Please sign in to view dashboard</p>
      <Link to="/login" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#9898a8' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e8e8ee', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      Loading...
    </div>
  );

  const monthlyLimit = getMonthlyPollLimit(user.tier || 'free');
  const pollsLeft    = monthlyLimit === Infinity ? '∞' : Math.max(0, monthlyLimit - (user.pollsThisMonth || 0));
  const usagePct     = monthlyLimit === Infinity ? 10 : Math.min(100, ((user.pollsThisMonth || 0) / monthlyLimit) * 100);
  const totalVotesOnMyPolls = myPolls.reduce((s, p) => s + p.totalVotes, 0);

  const filteredPolls = myPolls.filter(p => {
    if (filter === 'all')    return true;
    if (filter === 'active') return !p.endsAt || new Date(p.endsAt) > new Date();
    if (filter === 'ended')  return p.endsAt && new Date(p.endsAt) <= new Date();
    return true;
  });

  const TABS = [
    { key: 'polls',   label: `My Polls (${myPolls.length})` },
    { key: 'votes',   label: `My Votes (${votes.length})`   },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 76, right: 20, zIndex: 999, background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: toast.type === 'success' ? '#14532d' : '#7f1d1d', borderRadius: 12, padding: '12px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.1)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Sidebar ── */}
        <aside>
          {/* User card */}
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '20px', marginBottom: 12, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 auto 12px', overflow: 'hidden' }}>
              {user.profileImage
                ? <img src={user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user.name?.[0] || 'U').toUpperCase()
              }
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>{user.name}</p>
            <p style={{ fontSize: 12, color: '#9898a8', margin: '2px 0 8px' }}>@{user.username || 'user'}</p>
            <span style={{ display: 'inline-block', background: user.tier === 'premium' || user.tier === 'organization' ? 'linear-gradient(90deg,#6C5CE7,#a855f7)' : '#f0f0f5', color: user.tier === 'premium' || user.tier === 'organization' ? '#fff' : '#9898a8', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
              {(user.tier || 'free').charAt(0).toUpperCase() + (user.tier || 'free').slice(1)}
            </span>
          </div>

          {/* Nav */}
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '12px', marginBottom: 12 }}>
            {[
              { key: 'polls',  icon: '🗳', label: 'My Polls'       },
              { key: 'votes',  icon: '✅', label: 'My Votes'       },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', borderRadius: 10, border: 'none', background: tab === item.key ? '#f0eeff' : 'transparent', color: tab === item.key ? '#6C5CE7' : '#6b6b7b', fontSize: 13, fontWeight: tab === item.key ? 700 : 500, cursor: 'pointer', marginBottom: 3 }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>{item.label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid #f4f4f6', marginTop: 8, paddingTop: 8 }}>
              <Link to={`/profile/${user.uid}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 10, textDecoration: 'none', color: '#6b6b7b', fontSize: 13, fontWeight: 500 }}>
                <span style={{ fontSize: 14 }}>👤</span> View Profile
              </Link>
              <Link to="/upgrade" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 10, textDecoration: 'none', color: '#6b6b7b', fontSize: 13, fontWeight: 500 }}>
                <span style={{ fontSize: 14 }}>⭐</span> Upgrade
              </Link>
            </div>
          </div>

          {/* Usage */}
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '16px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9898a8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Monthly usage</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9898a8', marginBottom: 6 }}>
              <span>{user.pollsThisMonth || 0} polls used</span>
              <span>{monthlyLimit === Infinity ? '∞' : monthlyLimit} total</span>
            </div>
            <div style={{ height: 5, background: '#f0f0f5', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${usagePct}%`, background: usagePct >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6C5CE7,#a855f7)', borderRadius: 99 }} />
            </div>
            <p style={{ fontSize: 11, color: '#9898a8', margin: 0 }}>
              {pollsLeft} remaining{' '}
              {user.tier === 'free' && <Link to="/upgrade" style={{ color: '#6C5CE7', fontWeight: 600 }}>· Upgrade</Link>}
            </p>
          </div>
        </aside>

        {/* ── Main ── */}
        <main>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111118', margin: 0 }}>Dashboard</h1>
              <p style={{ fontSize: 13, color: '#9898a8', margin: '3px 0 0' }}>Welcome back, {user.name?.split(' ')[0] || 'there'}! 👋</p>
            </div>
            <Link to="/create" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 12, padding: '11px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              + Create Poll
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <StatCard icon="🗳" value={myPolls.length}                label="Polls created"      sub="All time"                        />
            <StatCard icon="📊" value={totalVotesOnMyPolls.toLocaleString()} label="Votes received" sub="Across all polls"            />
            <StatCard icon="✅" value={votes.length}                  label="Votes cast"         sub="By you"                          />
            <StatCard icon="📅" value={pollsLeft}                     label="Polls left"         sub="This month" color={typeof pollsLeft === 'number' && pollsLeft <= 1 ? '#ef4444' : '#6C5CE7'} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--pmn-border)', marginBottom: 20 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ padding: '10px 18px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? '#6C5CE7' : '#9898a8', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? '#6C5CE7' : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* My Polls tab */}
          {tab === 'polls' && (
            <>
              {/* Filter chips */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['all', 'active', 'ended'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid', borderColor: filter === f ? 'transparent' : '#e8e8ee', background: filter === f ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : '#fff', color: filter === f ? '#fff' : '#6b6b7b', cursor: 'pointer' }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {filteredPolls.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid var(--pmn-border)' }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🗳</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#6b6b7b', marginBottom: 16 }}>No polls yet</p>
                  <Link to="/create" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 12, padding: '11px 22px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Create your first poll</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredPolls.map(poll => {
                    const isActive = !poll.endsAt || new Date(poll.endsAt) > new Date();
                    return (
                      <div key={poll.id} style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow .15s' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--pmn-shadow-sm)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                          {POLL_TYPE_ICONS[poll.type] || '🗳'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link to={`/poll/${poll.id}`} style={{ fontSize: 14, fontWeight: 700, color: '#111', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {poll.question}
                          </Link>
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#9898a8' }}>📅 {formatDate(poll.createdAt)}</span>
                            <span style={{ fontSize: 11, color: '#9898a8' }}>👥 {poll.totalVotes.toLocaleString()} votes</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#22c55e' : '#9898a8', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#22c55e' : '#d0d0d0', display: 'inline-block' }} />
                              {isActive ? 'Active' : 'Ended'}
                            </span>
                            {poll.meta?.isLive && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>🔴 Live</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                          <Link to={`/create?edit=${poll.id}`} title="Edit" style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #e8e8ee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, textDecoration: 'none', color: '#6b6b7b', transition: 'all .12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0eeff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            ✏️
                          </Link>
                          <button
                            title="Delete"
                            onClick={() => handleDelete(poll.id)}
                            disabled={deleting === poll.id}
                            style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #fecaca', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', color: '#ef4444', transition: 'all .12s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                          >
                            {deleting === poll.id ? '⏳' : '🗑️'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* My Votes tab */}
          {tab === 'votes' && (
            <div>
              {votes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid var(--pmn-border)' }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#6b6b7b', marginBottom: 16 }}>You haven't voted yet</p>
                  <Link to="/explore" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 12, padding: '11px 22px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Browse Polls</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {votes.slice(0, 20).map(vote => (
                    <div key={vote.id} style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Poll: {vote.pollId}</p>
                        <p style={{ fontSize: 11, color: '#9898a8', margin: '3px 0 0' }}>
                          Option voted: <strong style={{ color: '#6C5CE7' }}>{vote.optionId}</strong>
                          {vote.isAnonymous && <span style={{ marginLeft: 8, color: '#9898a8' }}>· Anonymous</span>}
                        </p>
                      </div>
                      <Link to={`/poll/${vote.pollId}`} style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#6C5CE7', textDecoration: 'none', background: '#f0eeff', borderRadius: 8, padding: '6px 12px' }}>View →</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .dash-grid { grid-template-columns: 1fr !important; }
          aside { display: none; }
          .stats-row { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}