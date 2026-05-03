// src/pages/SearchPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import { useDebounce } from '../hooks/useDebounce';
import { VerifiedBadge, PremiumBadge } from '../components/UI';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', targeted:'🎯', live:'🔴' };
const TRENDING_TAGS = ['remote work', 'AI tools', 'sports', 'technology', 'politics', 'food'];
const POLLS_PER_PAGE = 20;

function extractKeywords(text) {
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
}

export default function SearchPage() {
  const [term, setTerm] = useState('');
  const [polls, setPolls] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('all');
  const [pollLastDoc, setPollLastDoc] = useState(null);
  const [hasMorePolls, setHasMorePolls] = useState(true);
  const [pollLoadingMore, setPollLoadingMore] = useState(false);
  const debounced = useDebounce(term, 450);
  const loadMoreRef = useRef(null);

  // Reset pagination when search term changes
  useEffect(() => {
    setPolls([]);
    setPollLastDoc(null);
    setHasMorePolls(true);
    setUsers([]);
  }, [debounced]);

  // Search polls using array-contains-any
  const searchPolls = useCallback(async (loadMore = false) => {
    if (!debounced.trim()) return;
    if (loadMore && (!hasMorePolls || pollLoadingMore)) return;

    setLoading(true);
    if (loadMore) setPollLoadingMore(true);
    else setLoading(true);

    try {
      const keywords = extractKeywords(debounced);
      // Firestore allows max 10 terms in array-contains-any – take first 10
      const searchTerms = keywords.slice(0, 10);
      if (searchTerms.length === 0) {
        setPolls([]);
        setHasMorePolls(false);
        return;
      }

      let q = query(
        collection(db, 'polls'),
        where('visibility', '==', 'public'),
        where('searchKeywords', 'array-contains-any', searchTerms),
        orderBy('totalVotes', 'desc'),
        limit(POLLS_PER_PAGE)
      );
      if (loadMore && pollLastDoc) {
        q = query(q, startAfter(pollLastDoc));
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (loadMore) {
        setPolls(prev => [...prev, ...results]);
      } else {
        setPolls(results);
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setPollLastDoc(lastVisible);
      setHasMorePolls(snapshot.docs.length === POLLS_PER_PAGE);
    } catch (err) {
      console.error('Poll search error:', err);
    } finally {
      setLoading(false);
      if (loadMore) setPollLoadingMore(false);
      else setLoading(false);
    }
  }, [debounced, pollLastDoc, hasMorePolls, pollLoadingMore]);

  // Trigger search when term changes (first page)
  useEffect(() => {
    if (debounced.trim()) {
      searchPolls(false);
    } else {
      setPolls([]);
      setUsers([]);
    }
  }, [debounced, searchPolls]);

  // Search users by username/name (prefix queries)
  useEffect(() => {
    if (!debounced.trim()) {
      setUsers([]);
      return;
    }
    const searchUsers = async () => {
      try {
        const lowerTerm = debounced.toLowerCase();
        // First try username prefix
        let q = query(
          collection(db, 'users'),
          where('username', '>=', lowerTerm),
          where('username', '<=', lowerTerm + '\uf8ff'),
          limit(30)
        );
        let snap = await getDocs(q);
        let userResults = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

        // If not enough, also search by name (requires index)
        if (userResults.length < 30) {
          const nameQuery = query(
            collection(db, 'users'),
            where('name', '>=', lowerTerm),
            where('name', '<=', lowerTerm + '\uf8ff'),
            limit(30 - userResults.length)
          );
          const nameSnap = await getDocs(nameQuery);
          const nameUsers = nameSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
          // Merge and deduplicate
          userResults = [...userResults, ...nameUsers].filter((v, i, a) => a.findIndex(t => t.uid === v.uid) === i);
        }
        setUsers(userResults);
      } catch (err) {
        console.error('User search error:', err);
      }
    };
    searchUsers();
  }, [debounced]);

  // Intersection observer for infinite scroll (load more polls)
  useEffect(() => {
    if (!hasMorePolls || !debounced.trim() || loading || pollLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePolls && !pollLoadingMore && !loading) {
          searchPolls(true);
        }
      },
      { threshold: 0.5 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMorePolls, debounced, loading, pollLoadingMore, searchPolls]);

  const shownPolls = tab === 'people' ? [] : polls;
  const shownUsers = tab === 'polls' ? [] : users;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        {/* Hero section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Search polls &amp; people</h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto">
            Find polls by keyword, tag, or category — or discover creators to follow.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search polls, users, tags..."
              className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-full shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              autoFocus
            />
            {term && (
              <button
                onClick={() => setTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Trending tags */}
          {!debounced && (
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              <span className="text-xs font-semibold text-gray-400 self-center">Trending:</span>
              {TRENDING_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTerm(tag)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary hover:text-primary transition"
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
            <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-gray-500">Searching...</span>
          </div>
        ) : debounced ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mt-8 mb-6">
              {[
                { key: 'all', label: `All (${polls.length + users.length})` },
                { key: 'polls', label: `Polls (${polls.length})` },
                { key: 'people', label: `People (${users.length})` },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    tab === t.key
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* People results */}
            {shownUsers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">People</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shownUsers.map(u => (
                    <Link
                      key={u.uid}
                      to={`/profile/${u.uid}`}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (u.name?.[0] || 'U').toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 truncate">{u.name || 'Anonymous'}</p>
                          {u.verified && <VerifiedBadge size={14} />}
                          {u.tier === 'premium' && <PremiumBadge size={14} />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {u.followersCount || 0} followers · {u.pollsCreated || 0} polls
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition">View →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Polls results */}
            {shownPolls.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Polls</h2>
                <div className="space-y-3">
                  {shownPolls.map(poll => (
                    <Link
                      key={poll.id}
                      to={`/poll/${poll.id}`}
                      className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                          {POLL_TYPE_ICONS[poll.type] || '🗳'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 line-clamp-2">{poll.question}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                            <span>👥 {poll.totalVotes?.toLocaleString() || 0} votes</span>
                            <span>by {poll.creator?.name || 'Anonymous'}</span>
                            {poll.category && <span>#{poll.category}</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">Vote →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {/* Infinite scroll trigger */}
                {hasMorePolls && (
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {pollLoadingMore && <div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />}
                  </div>
                )}
                {!hasMorePolls && polls.length > 0 && (
                  <p className="text-center text-gray-400 text-sm mt-4">No more polls to load</p>
                )}
              </div>
            )}

            {shownPolls.length === 0 && shownUsers.length === 0 && !loading && (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <p className="text-5xl mb-3">🤷</p>
                <p className="text-gray-700 font-semibold">No results for "{debounced}"</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search term or browse explore.</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-6xl mb-3">🔍</p>
            <p className="text-gray-500">Start typing to search polls and people</p>
          </div>
        )}
      </div>
    </div>
  );
}