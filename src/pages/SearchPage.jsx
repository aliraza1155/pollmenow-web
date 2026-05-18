// src/pages/SearchPage.jsx – dark/light mode aware
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { useDebounce } from '../hooks/useDebounce';
import { VerifiedBadge, PremiumBadge } from '../components/UI';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', live:'🔴' };
const TRENDING_TAGS   = ['remote work','AI tools','sports','technology','politics','food'];
const POLLS_PER_PAGE  = 20;

function extractKeywords(text) {
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
}

export default function SearchPage() {
  const [term,           setTerm]           = useState('');
  const [polls,          setPolls]          = useState([]);
  const [users,          setUsers]          = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [tab,            setTab]            = useState('all');
  const [pollLastDoc,    setPollLastDoc]    = useState(null);
  const [hasMorePolls,   setHasMorePolls]   = useState(true);
  const [pollLoadingMore,setPollLoadingMore]= useState(false);
  const debounced  = useDebounce(term, 450);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    setPolls([]); setPollLastDoc(null); setHasMorePolls(true); setUsers([]);
  }, [debounced]);

  const searchPolls = useCallback(async (loadMore = false) => {
    if (!debounced.trim()) return;
    if (loadMore && (!hasMorePolls || pollLoadingMore)) return;
    if (loadMore) setPollLoadingMore(true); else setLoading(true);
    try {
      const keywords = extractKeywords(debounced).slice(0, 10);
      if (!keywords.length) { setPolls([]); setHasMorePolls(false); return; }
      let q = query(
        collection(db,'polls'),
        where('visibility','==','public'),
        where('searchKeywords','array-contains-any',keywords),
        orderBy('totalVotes','desc'),
        limit(POLLS_PER_PAGE)
      );
      if (loadMore && pollLastDoc) q = query(q, startAfter(pollLastDoc));
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      loadMore ? setPolls(prev => [...prev, ...results]) : setPolls(results);
      setPollLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMorePolls(snap.docs.length === POLLS_PER_PAGE);
    } catch (err) { console.error('Poll search error:', err); }
    finally { if (loadMore) setPollLoadingMore(false); else setLoading(false); }
  }, [debounced, pollLastDoc, hasMorePolls, pollLoadingMore]);

  useEffect(() => {
    if (debounced.trim()) searchPolls(false);
    else { setPolls([]); setUsers([]); }
  }, [debounced, searchPolls]);

  useEffect(() => {
    if (!debounced.trim()) { setUsers([]); return; }
    const searchUsers = async () => {
      try {
        const lower = debounced.toLowerCase();
        let q = query(collection(db,'users'), where('username','>=',lower), where('username','<=',lower+'\uf8ff'), limit(30));
        let snap = await getDocs(q);
        let results = snap.docs.map(d => ({ uid:d.id, ...d.data() }));
        if (results.length < 30) {
          const nameSnap = await getDocs(query(collection(db,'users'), where('name','>=',lower), where('name','<=',lower+'\uf8ff'), limit(30-results.length)));
          const nameUsers = nameSnap.docs.map(d => ({ uid:d.id, ...d.data() }));
          results = [...results, ...nameUsers].filter((v,i,a) => a.findIndex(t=>t.uid===v.uid)===i);
        }
        setUsers(results);
      } catch (err) { console.error('User search error:', err); }
    };
    searchUsers();
  }, [debounced]);

  useEffect(() => {
    if (!hasMorePolls || !debounced.trim() || loading || pollLoadingMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMorePolls && !pollLoadingMore && !loading) searchPolls(true);
    }, { threshold: 0.5 });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMorePolls, debounced, loading, pollLoadingMore, searchPolls]);

  const shownPolls = tab === 'people' ? [] : polls;
  const shownUsers = tab === 'polls'  ? [] : users;

  // shared classes
  const tabCls = (active) => `px-4 py-2 text-sm font-medium transition ${active ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`;
  const pillActiveCls = 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm';
  const pillIdleCls   = 'bg-white dark:bg-[#0f1120] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#08091a]">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">

        {/* Hero */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-[#f0f0ff] mb-2">
            Search polls &amp; people
          </h1>
          <p className="text-gray-500 dark:text-[rgba(240,240,255,0.5)] text-sm sm:text-base max-w-md mx-auto">
            Find polls by keyword, tag, or category — or discover creators to follow.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-400 dark:text-gray-500 text-lg">🔍</span>
            </div>
            <input
              type="text"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="Search polls, users, tags…"
              className="w-full pl-11 pr-12 py-3
                bg-white dark:bg-[#0f1120]
                border border-gray-200 dark:border-white/12
                text-gray-800 dark:text-[#f0f0ff]
                placeholder-gray-400 dark:placeholder-[rgba(240,240,255,0.38)]
                rounded-full shadow-sm
                focus:border-primary dark:focus:border-primary
                focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/25
                outline-none transition"
              autoFocus
            />
            {term && (
              <button
                onClick={() => setTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Trending tags */}
          {!debounced && (
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 self-center">Trending:</span>
              {TRENDING_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTerm(tag)}
                  className="px-3 py-1.5 text-xs font-medium
                    bg-white dark:bg-[#0f1120]
                    border border-gray-200 dark:border-white/10
                    rounded-full text-gray-600 dark:text-gray-400
                    hover:border-primary hover:text-primary transition"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {loading && polls.length === 0 ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-3 border-gray-200 dark:border-white/15 border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-gray-500 dark:text-gray-400">Searching…</span>
          </div>
        ) : debounced ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-white/10 mt-8 mb-6">
              {[
                { key:'all',    label:`All (${polls.length + users.length})` },
                { key:'polls',  label:`Polls (${polls.length})`              },
                { key:'people', label:`People (${users.length})`             },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={tabCls(tab === t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* People */}
            {shownUsers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f0f0ff] mb-4">People</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shownUsers.map(u => (
                    <Link
                      key={u.uid}
                      to={`/profile/${u.uid}`}
                      className="flex items-center gap-3 p-3
                        bg-white dark:bg-[#0f1120]
                        rounded-xl border border-gray-100 dark:border-white/8
                        shadow-sm hover:shadow-md dark:hover:shadow-black/30
                        transition group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                        {u.profileImage
                          ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                          : (u.name?.[0] || 'U').toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{u.name || 'Anonymous'}</p>
                          {u.verified    && <VerifiedBadge size={14} />}
                          {u.tier === 'premium' && <PremiumBadge size={14} />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {u.followersCount || 0} followers · {u.pollsCreated || 0} polls
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition">View →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Polls */}
            {shownPolls.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f0f0ff] mb-4">Polls</h2>
                <div className="space-y-3">
                  {shownPolls.map(poll => (
                    <Link
                      key={poll.id}
                      to={`/poll/${poll.id}`}
                      className="block bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-4 shadow-sm hover:shadow-md dark:hover:shadow-black/30 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-xl flex-shrink-0">
                          {POLL_TYPE_ICONS[poll.type] || '🗳'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{poll.question}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                            <span>👥 {poll.totalVotes?.toLocaleString() || 0} votes</span>
                            <span>by {poll.creator?.name || 'Anonymous'}</span>
                            {poll.category && <span>#{poll.category}</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-xs font-bold text-primary bg-primary/10 dark:bg-primary/15 px-3 py-1.5 rounded-full">Vote →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Infinite scroll trigger */}
                {hasMorePolls && (
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {pollLoadingMore && <div className="w-6 h-6 border-2 border-gray-200 dark:border-white/15 border-t-primary rounded-full animate-spin" />}
                  </div>
                )}
                {!hasMorePolls && polls.length > 0 && (
                  <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-4">No more polls to load</p>
                )}
              </div>
            )}

            {shownPolls.length === 0 && shownUsers.length === 0 && !loading && (
              <div className="text-center py-16 bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8">
                <p className="text-5xl mb-3">🤷</p>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">No results for "{debounced}"</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try a different search term or browse explore.</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-6xl mb-3">🔍</p>
            <p className="text-gray-500 dark:text-gray-400">Start typing to search polls and people</p>
          </div>
        )}
      </div>
    </div>
  );
}