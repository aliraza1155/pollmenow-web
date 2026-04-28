// src/pages/SearchPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useDebounce } from '../hooks/useDebounce';
import { toDate, formatDate } from '../lib/utils';
import { Button, Card, VerifiedBadge, PremiumBadge } from '../components/UI';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', targeted:'🎯', live:'🔴' };
const TRENDING_TAGS = ['remote work', 'AI tools', 'sports', 'technology', 'politics', 'food'];

export function SearchPage() {
  const [term, setTerm] = useState('');
  const [polls, setPolls] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('all');
  const debounced = useDebounce(term, 450);

  useEffect(() => {
    if (!debounced.trim()) {
      setPolls([]);
      setUsers([]);
      return;
    }
    const search = async () => {
      setLoading(true);
      try {
        const pollsSnap = await getDocs(
          query(collection(db, 'polls'), where('visibility', '==', 'public'), orderBy('totalVotes', 'desc'), limit(30))
        );
        const lower = debounced.toLowerCase();
        const filteredPolls = pollsSnap.docs
          .map(d => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) }))
          .filter(
            p =>
              p.question?.toLowerCase().includes(lower) ||
              (p.tags || []).some(t => t.includes(lower)) ||
              p.category?.includes(lower)
          );
        setPolls(filteredPolls);

        const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('name'), limit(30)));
        const filteredUsers = usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.username?.toLowerCase().includes(lower) || u.name?.toLowerCase().includes(lower));
        setUsers(filteredUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    search();
  }, [debounced]);

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
        {loading ? (
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
                      <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition">
                        View →
                      </span>
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
                          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                            Vote →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {shownPolls.length === 0 && shownUsers.length === 0 && (
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

export default SearchPage;