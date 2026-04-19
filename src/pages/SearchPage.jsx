// ============================================================
// src/pages/SearchPage.jsx
// ============================================================
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useDebounce } from '../hooks/useDebounce';
import { toDate, formatDate } from '../lib/utils';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', targeted:'🎯', live:'🔴' };
const TRENDING_TAGS   = ['remote work', 'AI tools', 'sports', 'technology', 'politics', 'food'];

export function SearchPage() {
  const [term,    setTerm]    = useState('');
  const [polls,   setPolls]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState('all'); // all | polls | people
  const debounced = useDebounce(term, 450);

  useEffect(() => {
    if (!debounced.trim()) { setPolls([]); setUsers([]); return; }
    const search = async () => {
      setLoading(true);
      try {
        const pollsSnap = await getDocs(query(collection(db, 'polls'), where('visibility','==','public'), orderBy('totalVotes','desc'), limit(30)));
        const lower = debounced.toLowerCase();
        setPolls(
          pollsSnap.docs
            .map(d => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) }))
            .filter(p => p.question?.toLowerCase().includes(lower) || (p.tags || []).some(t => t.includes(lower)) || p.category?.includes(lower))
        );
        const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('name'), limit(30)));
        setUsers(
          usersSnap.docs
            .map(d => ({ uid: d.id, ...d.data() }))
            .filter(u => u.username?.toLowerCase().includes(lower) || u.name?.toLowerCase().includes(lower))
        );
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    search();
  }, [debounced]);

  const shownPolls = tab === 'people' ? []  : polls;
  const shownUsers = tab === 'polls'  ? []  : users;

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 60px' }}>

        {/* Hero search */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111118', marginBottom: 6 }}>Search polls &amp; people</h1>
          <p style={{ fontSize: 14, color: '#9898a8', marginBottom: 22 }}>Find polls by keyword, tag, or category — or discover creators to follow.</p>

          {/* Search bar */}
          <div style={{ background: '#fff', border: '1.5px solid var(--pmn-border)', borderRadius: 50, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(0,0,0,.06)', maxWidth: 520, margin: '0 auto', transition: 'box-shadow .15s', ':focus-within': { boxShadow: '0 4px 20px rgba(108,92,231,.15)' } }}>
            <span style={{ fontSize: 18, color: '#9898a8' }}>🔍</span>
            <input
              autoFocus
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#111', background: 'transparent', fontFamily: 'inherit' }}
              placeholder="Search polls, users, tags..."
              value={term}
              onChange={e => setTerm(e.target.value)}
            />
            {term && (
              <button onClick={() => setTerm('')} style={{ background: '#f4f4f6', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#9898a8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            )}
          </div>

          {/* Trending tags */}
          {!debounced && (
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
              <span style={{ fontSize: 12, color: '#9898a8', fontWeight: 600, alignSelf: 'center' }}>Trending:</span>
              {TRENDING_TAGS.map(tag => (
                <button key={tag} onClick={() => setTerm(tag)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid #e8e8ee', background: '#fff', color: '#6b6b7b', cursor: 'pointer', transition: 'all .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0eeff'; e.currentTarget.style.color = '#6C5CE7'; e.currentTarget.style.borderColor = '#d4ccf0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b6b7b'; e.currentTarget.style.borderColor = '#e8e8ee'; }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9898a8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e8e8ee', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            Searching...
          </div>
        ) : debounced ? (
          <>
            {/* Tab filter */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--pmn-border)', marginBottom: 22 }}>
              {[
                { key: 'all',    label: `All (${polls.length + users.length})`  },
                { key: 'polls',  label: `Polls (${polls.length})`               },
                { key: 'people', label: `People (${users.length})`              },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '9px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? '#6C5CE7' : '#9898a8', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? '#6C5CE7' : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* People */}
            {shownUsers.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>People</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shownUsers.map(u => (
                    <Link key={u.uid} to={`/user/${u.uid}`} style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', transition: 'box-shadow .15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.06)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                        {u.profileImage ? <img src={u.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name?.[0] || 'U').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {u.name || 'Anonymous'}
                          {u.verified && <span style={{ color: '#6C5CE7', fontSize: 12 }}>✓</span>}
                          {u.tier === 'premium' && <span style={{ fontSize: 12 }}>⭐</span>}
                        </p>
                        <p style={{ fontSize: 12, color: '#9898a8', margin: '2px 0 0' }}>@{u.username} · {u.followersCount || 0} followers · {u.pollsCreated || 0} polls</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6C5CE7', background: '#f0eeff', borderRadius: 8, padding: '5px 12px', flexShrink: 0 }}>View →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Polls */}
            {shownPolls.length > 0 && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>Polls</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shownPolls.map(poll => (
                    <Link key={poll.id} to={`/poll/${poll.id}`} style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '16px 18px', textDecoration: 'none', display: 'block', transition: 'box-shadow .15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.06)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {POLL_TYPE_ICONS[poll.type] || '🗳'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 5px', lineHeight: 1.4 }}>{poll.question}</p>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#9898a8' }}>👥 {poll.totalVotes?.toLocaleString() || 0} votes</span>
                            <span style={{ fontSize: 11, color: '#9898a8' }}>by {poll.creator?.name || 'Anonymous'}</span>
                            {poll.category && <span style={{ fontSize: 11, color: '#9898a8', textTransform: 'capitalize' }}>#{poll.category}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6C5CE7', background: '#f0eeff', borderRadius: 8, padding: '5px 12px', flexShrink: 0 }}>Vote →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {shownPolls.length === 0 && shownUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid var(--pmn-border)' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🤷</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#6b6b7b' }}>No results for "{debounced}"</p>
                <p style={{ fontSize: 13, color: '#9898a8' }}>Try a different search term or browse the explore page.</p>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9898a8' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🔍</p>
            <p style={{ fontSize: 14 }}>Start typing to search polls and people</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default SearchPage;