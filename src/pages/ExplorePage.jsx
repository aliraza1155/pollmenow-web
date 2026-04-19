// src/pages/ExplorePage.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, convertOptionsToArray, toDate } from '../lib/utils';
import { CATEGORIES, POLL_TYPES } from '../lib/constants';
import { getFollowing } from '../lib/follow';
import { VerifiedBadge, PremiumBadge } from '../components/UI';

/* ─── constants ─────────────────────────────────────────── */
const SECTIONS = [
  { key: 'trending', label: 'Trending',  icon: '🔥', color: '#f59e0b' },
  { key: 'live',     label: 'Live',      icon: '🔴', color: '#ef4444' },
  { key: 'premium',  label: 'Premium',   icon: '💎', color: '#8b5cf6' },
  { key: 'friends',  label: 'Friends',   icon: '👥', color: '#3b82f6' },
  { key: 'for_you',  label: 'For You',   icon: '✨', color: '#6C5CE7' },
];

const TYPE_FILTERS = [
  { key: 'all',        label: 'All types' },
  { key: 'quick',      label: 'Quick'     },
  { key: 'yesno',      label: 'Yes / No'  },
  { key: 'rating',     label: 'Rating'    },
  { key: 'comparison', label: 'Comparison'},
  { key: 'targeted',   label: 'Targeted'  },
  { key: 'live',       label: 'Live'      },
];

const TYPE_BADGE = {
  quick:      { label: '⚡ Quick',      cls: 'badge-quick'      },
  yesno:      { label: '✅ Yes / No',   cls: 'badge-yesno'      },
  rating:     { label: '⭐ Rating',     cls: 'badge-rating'     },
  comparison: { label: '⚖ Compare',    cls: 'badge-comparison' },
  targeted:   { label: '🎯 Targeted',   cls: 'badge-targeted'   },
  live:       { label: '🔴 Live',       cls: 'badge-live'       },
};

/* ─── helpers ───────────────────────────────────────────── */
function processDoc(docSnap) {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    question:      d.question || '',
    description:   d.description,
    options:       convertOptionsToArray(d.options),
    type:          d.type || 'quick',
    category:      d.category || 'general',
    tags:          d.tags || [],
    totalVotes:    Number(d.totalVotes) || 0,
    score24h:      Number(d.score24h) || 0,
    visibility:    d.visibility || 'public',
    anonymous:     d.anonymous || false,
    accessCode:    d.accessCode,
    questionMedia: d.questionMedia,
    createdAt:     toDate(d.createdAt) || new Date(),
    endsAt:        d.endsAt ? toDate(d.endsAt) : undefined,
    creator: {
      id:           d.creator?.id || '',
      name:         d.creator?.name || 'Anonymous',
      username:     d.creator?.username,
      type:         d.creator?.type || 'individual',
      verified:     d.creator?.verified || false,
      profileImage: d.creator?.profileImage,
      tier:         d.creator?.tier || 'free',
    },
    meta: {
      isPremium:  d.meta?.isPremium  || false,
      isVerified: d.meta?.isVerified || false,
      isLive:     d.meta?.isLive     || false,
    },
  };
}

function timeLeft(endsAt) {
  if (!endsAt) return null;
  const diff = endsAt - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d left`;
  if (h > 0)  return `${h}h left`;
  return `${m}m left`;
}

/* ─── PollCard ──────────────────────────────────────────── */
function PollCard({ poll }) {
  const badge    = TYPE_BADGE[poll.type] || TYPE_BADGE.quick;
  const tLeft    = timeLeft(poll.endsAt);
  const totalV   = poll.totalVotes;
  const top2     = poll.options.slice(0, 2);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--pmn-border)',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'box-shadow .18s, transform .18s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--pmn-shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Light question block */}
      <div style={{ background: '#f7f7fb', padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className={`type-badge ${badge.cls}`}>{badge.label}</span>
          {tLeft && (
            <span style={{ fontSize: 11, color: poll.meta?.isLive ? '#ef4444' : '#9898a8', fontWeight: 600 }}>
              {poll.meta?.isLive ? '● ' : ''}{tLeft}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#111118', lineHeight: 1.4, margin: 0 }}>{poll.question}</p>
        {poll.questionMedia && (
          <img
            src={poll.questionMedia.url}
            alt=""
            style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, marginTop: 10 }}
          />
        )}
        {/* Comparison grid */}
        {(poll.type === 'comparison' || poll.type === 'live') && top2.some(o => o.mediaUrl) ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            {top2.map(opt => (
              <div key={opt.id} style={{ borderRadius: 9, overflow: 'hidden', border: '1px solid #e8e8ee', background: '#fff' }}>
                {opt.mediaUrl
                  ? <img src={opt.mediaUrl} alt={opt.text} style={{ width: '100%', height: 60, objectFit: 'cover' }} />
                  : <div style={{ height: 60, background: '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#bbb' }}>No image</div>
                }
                <div style={{ padding: '5px 7px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#111', margin: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.text}</p>
                  {totalV > 0 && (
                    <p style={{ fontSize: 10, color: '#9898a8', margin: 0, textAlign: 'center' }}>
                      {((opt.votes / totalV) * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : poll.type === 'yesno' ? (
          /* Yes/No */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            {['Yes', 'No'].map(label => {
              const opt = poll.options.find(o => o.text === label);
              const pct = totalV > 0 && opt ? ((opt.votes / totalV) * 100).toFixed(0) : 0;
              return (
                <div key={label} style={{
                  borderRadius: 8, padding: '9px 12px', textAlign: 'center',
                  background: label === 'Yes' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${label === 'Yes' ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: label === 'Yes' ? '#14532d' : '#7f1d1d', margin: 0 }}>{label}</p>
                  {totalV > 0 && <p style={{ fontSize: 11, color: label === 'Yes' ? '#166534' : '#991b1b', margin: '2px 0 0', fontWeight: 600 }}>{pct}%</p>}
                </div>
              );
            })}
          </div>
        ) : poll.type === 'rating' ? (
          /* Rating stars */
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,2,3,4,5].map(i => (
                <span key={i} style={{ fontSize: 18, color: i <= Math.round(poll.averageRating || 0) ? '#f59e0b' : '#e5e7eb' }}>★</span>
              ))}
            </div>
            {totalV > 0 && <p style={{ fontSize: 11, color: '#9898a8', margin: '4px 0 0' }}>{(poll.averageRating || 0).toFixed(1)} / 5 · {totalV} ratings</p>}
          </div>
        ) : (
          /* Standard options with bar fill */
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {top2.map(opt => {
              const pct = totalV > 0 ? (opt.votes / totalV) * 100 : 0;
              return (
                <div key={opt.id} style={{ position: 'relative', background: '#fff', borderRadius: 7, border: '1px solid #e8e8ee', height: 30, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'rgba(108,92,231,.10)', borderRadius: 7 }} />
                  <span style={{ position: 'relative', flex: 1, fontSize: 11, fontWeight: 500, color: '#111', padding: '0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.text}</span>
                  {totalV > 0 && <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, color: '#6C5CE7', paddingRight: 10 }}>{pct.toFixed(0)}%</span>}
                </div>
              );
            })}
            {poll.options.length > 2 && (
              <p style={{ fontSize: 11, color: '#9898a8', margin: 0, textAlign: 'center' }}>+{poll.options.length - 2} more options</p>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0f0f5' }}>
        <Link to={`/user/${poll.creator.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', minWidth: 0, flex: 1 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6C5CE7,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
            overflow: 'hidden',
          }}>
            {poll.creator.profileImage
              ? <img src={poll.creator.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (poll.creator.name?.[0] || 'U').toUpperCase()
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
              {poll.creator.name}
              {poll.creator.verified && <span style={{ color: '#6C5CE7', fontSize: 10 }}>✓</span>}
            </p>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#9898a8' }}>{totalV.toLocaleString()} votes</span>
          <Link
            to={`/poll/${poll.id}`}
            style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Vote
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
export default function ExplorePage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [polls,          setPolls]          = useState({ trending: [], live: [], premium: [], friends: [], for_you: [] });
  const [activeSection,  setActiveSection]  = useState('trending');
  const [activePollType, setActivePollType] = useState('all');
  const [selectedCats,   setSelectedCats]   = useState(['all']);
  const [showFilters,    setShowFilters]    = useState(false);
  const [sectionLoading, setSectionLoading] = useState({});
  const [initialDone,    setInitialDone]    = useState(false);
  const [accessCode,     setAccessCode]     = useState('');
  const [accessError,    setAccessError]    = useState('');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);

  /* fetch one section */
  const fetchSection = useCallback(async (section) => {
    setSectionLoading(prev => ({ ...prev, [section]: true }));
    try {
      const base = collection(db, 'polls');
      const now  = Timestamp.now();
      let q;

      switch (section) {
        case 'trending': q = query(base, where('visibility','==','public'), orderBy('totalVotes','desc'), limit(20)); break;
        case 'live':     q = query(base, where('visibility','==','public'), where('meta.isLive','==',true), where('endsAt','>',now), orderBy('endsAt','asc'), limit(15)); break;
        case 'premium':  q = query(base, where('visibility','==','public'), where('meta.isPremium','==',true), orderBy('createdAt','desc'), limit(15)); break;
        case 'friends': {
          if (!user) { setPolls(p => ({ ...p, friends: [] })); return; }
          const ids = await getFollowing(user.uid);
          if (!ids.length) { setPolls(p => ({ ...p, friends: [] })); return; }
          q = query(base, where('visibility','in',['public','friends']), where('creator.id','in',ids.slice(0,10)), orderBy('createdAt','desc'), limit(15));
          break;
        }
        case 'for_you': {
          if (!user) { setPolls(p => ({ ...p, for_you: [] })); return; }
          q = query(base, where('visibility','==','public'), orderBy('score24h','desc'), limit(15));
          break;
        }
        default: return;
      }

      const snap   = await getDocs(q);
      let results  = snap.docs.map(processDoc);

      if (!selectedCats.includes('all')) {
        results = results.filter(p => selectedCats.includes(p.category));
      }
      if (activePollType !== 'all') {
        results = results.filter(p => p.type === activePollType);
      }

      setPolls(prev => ({ ...prev, [section]: results }));
    } catch (err) {
      console.error(`[Explore] ${section}:`, err);
    } finally {
      setSectionLoading(prev => ({ ...prev, [section]: false }));
    }
  }, [user, selectedCats, activePollType]);

  /* initial load */
  useEffect(() => {
    const sections = ['trending', 'live', 'premium', ...(user ? ['friends', 'for_you'] : [])];
    Promise.all(sections.map(s => fetchSection(s))).finally(() => setInitialDone(true));
  }, [fetchSection, user]);

  /* re-fetch on filter change */
  useEffect(() => {
    if (!initialDone) return;
    const t = setTimeout(() => fetchSection(activeSection), 200);
    return () => clearTimeout(t);
  }, [selectedCats, activePollType, activeSection]);

  const toggleCat = (id) => {
    if (id === 'all') { setSelectedCats(['all']); return; }
    setSelectedCats(prev => {
      const without = prev.filter(c => c !== 'all');
      return without.includes(id) ? without.filter(c => c !== id) : [...without, id];
    });
  };

  const handleAccessCode = async () => {
    setAccessError('');
    if (!accessCode.trim()) return;
    try {
      const snap = await getDocs(query(collection(db, 'polls'), where('accessCode','==',accessCode.trim().toUpperCase()), limit(1)));
      if (!snap.empty) { navigate(`/poll/${snap.docs[0].id}`); setAccessCode(''); }
      else setAccessError('No poll found with this code.');
    } catch { setAccessError('Failed to validate code.'); }
  };

  const currentPolls = polls[activeSection] || [];
  const isLoading    = sectionLoading[activeSection];

  /* styles */
  const S = {
    page:         { minHeight: '100vh', background: '#fafafa' },
    inner:        { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
    layout:       { display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, paddingTop: 24, paddingBottom: 40 },
    sidebar:      { display: 'flex', flexDirection: 'column', gap: 8 },
    sideCard:     { background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '16px 12px' },
    sideLabel:    { fontSize: 11, fontWeight: 700, color: '#9898a8', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 },
    sideItem:     { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#6b6b7b', cursor: 'pointer', transition: 'background .12s', textDecoration: 'none', border: 'none', background: 'transparent', width: '100%', textAlign: 'left' },
    topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
    filterRow:    { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
    chip:         { padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--pmn-border)', background: '#fff', color: '#6b6b7b', cursor: 'pointer', transition: 'all .12s', whiteSpace: 'nowrap' },
    chipActive:   { background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderColor: 'transparent' },
    pollGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 },
    accessBar:    { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 12, padding: '8px 14px', marginBottom: 20 },
    emptyBox:     { gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#9898a8' },
  };

  // For responsive sidebar toggle (optional)
  const isMobile = window.innerWidth <= 768;
  const layoutStyle = { ...S.layout, gridTemplateColumns: (sidebarOpen || !isMobile) ? '220px 1fr' : '1fr' };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={layoutStyle}>
          {/* Sidebar */}
          <aside style={S.sidebar}>
            <div style={S.sideCard}>
              <p style={S.sideLabel}>Sections</p>
              {SECTIONS.map(sec => (
                <button
                  key={sec.key}
                  style={{ ...S.sideItem, ...(activeSection === sec.key ? { background: '#f0eeff', color: '#6C5CE7', fontWeight: 700 } : {}) }}
                  onClick={() => setActiveSection(sec.key)}
                >
                  <span style={{ fontSize: 14 }}>{sec.icon}</span>
                  {sec.label}
                </button>
              ))}
            </div>
            <div style={S.sideCard}>
              <p style={S.sideLabel}>Categories</p>
              {[{ id: 'all', name: 'All' }, ...CATEGORIES].map(cat => (
                <button
                  key={cat.id}
                  style={{ ...S.sideItem, ...(selectedCats.includes(cat.id) ? { background: '#f0eeff', color: '#6C5CE7', fontWeight: 700 } : {}) }}
                  onClick={() => toggleCat(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </aside>

          {/* Main */}
          <main>
            {/* Access code */}
            <div style={S.accessBar}>
              <span style={{ fontSize: 14 }}>🔑</span>
              <input
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: '#111' }}
                placeholder="Enter private poll access code..."
                value={accessCode}
                onChange={e => { setAccessCode(e.target.value); setAccessError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAccessCode()}
              />
              <button
                onClick={handleAccessCode}
                style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Go
              </button>
            </div>
            {accessError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: -14, marginBottom: 12 }}>{accessError}</p>}

            {/* Section header */}
            <div style={S.topBar}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111118', margin: 0 }}>
                  {SECTIONS.find(s => s.key === activeSection)?.icon} {SECTIONS.find(s => s.key === activeSection)?.label}
                </h2>
                <p style={{ fontSize: 12, color: '#9898a8', margin: '2px 0 0' }}>{currentPolls.length} polls</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowFilters(v => !v)}
                  style={{ ...S.chip, ...(showFilters ? S.chipActive : {}) }}
                >
                  {showFilters ? '✕ Hide filters' : '⊞ Filters'}
                </button>
                <Link to="/create" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  + Create Poll
                </Link>
              </div>
            </div>

            {/* Type filters */}
            {showFilters && (
              <div style={S.filterRow}>
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    style={{ ...S.chip, ...(activePollType === f.key ? S.chipActive : {}) }}
                    onClick={() => setActivePollType(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9898a8' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #e8e8ee', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                Loading polls...
              </div>
            ) : currentPolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9898a8', background: '#fff', borderRadius: 16, border: '1px solid var(--pmn-border)' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>😶</p>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#6b6b7b' }}>No polls here yet</p>
                {(!user && (activeSection === 'friends' || activeSection === 'for_you')) ? (
                  <Link to="/login" style={{ display: 'inline-flex', marginTop: 12, background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                ) : (
                  <Link to="/create" style={{ display: 'inline-flex', marginTop: 12, background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Create the first one</Link>
                )}
              </div>
            ) : (
              <div style={S.pollGrid}>
                {currentPolls.map(p => <PollCard key={p.id} poll={p} />)}
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .explore-layout-inner { grid-template-columns: 1fr !important; }
          aside { display: none; }
        }
      `}</style>
    </div>
  );
}