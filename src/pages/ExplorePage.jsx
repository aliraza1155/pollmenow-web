// src/pages/ExplorePage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { convertOptionsToArray, toDate } from '../lib/utils';
import { CATEGORIES } from '../lib/constants';
import { getFollowing } from '../lib/follow';

// ============================================================
// Constants & Helpers
// ============================================================
const SECTIONS = [
  { key: 'trending', label: 'Trending', icon: '🔥', color: '#f59e0b' },
  { key: 'live', label: 'Live', icon: '🔴', color: '#ef4444' },
  { key: 'premium', label: 'Premium', icon: '💎', color: '#8b5cf6' },
  { key: 'friends', label: 'Friends', icon: '👥', color: '#3b82f6' },
  { key: 'for_you', label: 'For You', icon: '✨', color: '#6C5CE7' },
];

const TYPE_FILTERS = [
  { key: 'all', label: 'All types' },
  { key: 'quick', label: 'Quick' },
  { key: 'yesno', label: 'Yes / No' },
  { key: 'rating', label: 'Rating' },
  { key: 'comparison', label: 'Comparison' },
  { key: 'targeted', label: 'Targeted' },
  { key: 'live', label: 'Live' },
];

const TYPE_BADGE = {
  quick: { label: '⚡ Quick', cls: 'bg-amber-50 text-amber-800' },
  yesno: { label: '✅ Yes / No', cls: 'bg-green-50 text-green-800' },
  rating: { label: '⭐ Rating', cls: 'bg-orange-50 text-orange-800' },
  comparison: { label: '⚖ Compare', cls: 'bg-blue-50 text-blue-800' },
  targeted: { label: '🎯 Targeted', cls: 'bg-purple-50 text-purple-800' },
  live: { label: '🔴 Live', cls: 'bg-red-50 text-red-800' },
};

function processDoc(docSnap) {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    question: d.question || '',
    description: d.description,
    options: convertOptionsToArray(d.options),
    type: d.type || 'quick',
    category: d.category || 'general',
    tags: d.tags || [],
    totalVotes: Number(d.totalVotes) || 0,
    totalViews: Number(d.totalViews) || 0,
    score24h: Number(d.score24h) || 0,
    visibility: d.visibility || 'public',
    anonymous: d.anonymous || false,
    accessCode: d.accessCode,
    questionMedia: d.questionMedia,
    createdAt: toDate(d.createdAt) || new Date(),
    endsAt: d.endsAt ? toDate(d.endsAt) : undefined,
    averageRating: d.averageRating || 0,
    creator: {
      id: d.creator?.id || '',
      name: d.creator?.name || 'Anonymous',
      username: d.creator?.username,
      type: d.creator?.type || 'individual',
      verified: d.creator?.verified || false,
      profileImage: d.creator?.profileImage,
      tier: d.creator?.tier || 'free',
    },
    meta: {
      isPremium: d.meta?.isPremium || false,
      isVerified: d.meta?.isVerified || false,
      isLive: d.meta?.isLive || false,
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
  if (h > 0) return `${h}h left`;
  return `${m}m left`;
}

// ============================================================
// Fixed PollCard Component - proper Link navigation with hover effects
// ============================================================
function PollCard({ poll }) {
  const badge = TYPE_BADGE[poll.type] || TYPE_BADGE.quick;
  const tLeft = timeLeft(poll.endsAt);
  const totalV = poll.totalVotes;
  const top2 = poll.options.slice(0, 2);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group">
      {/* Entire top section is clickable via Link */}
      <Link to={`/poll/${poll.id}`} className="block">
        <div className="bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
            {tLeft && (
              <span className={`text-xs font-semibold ${poll.meta?.isLive ? 'text-red-500' : 'text-gray-400'}`}>
                {poll.meta?.isLive && '● '}{tLeft}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
            {poll.question}
          </p>
          {poll.questionMedia && (
            <img src={poll.questionMedia.url} alt="" className="w-full h-24 object-cover rounded-md mt-3" />
          )}

          {(poll.type === 'comparison' || poll.type === 'live') && top2.some(o => o.mediaUrl) ? (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {top2.map(opt => (
                <div key={opt.id} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                  {opt.mediaUrl ? (
                    <img src={opt.mediaUrl} alt={opt.text} className="w-full h-16 object-cover" />
                  ) : (
                    <div className="h-16 bg-gray-100 flex items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                  <div className="p-1.5 text-center">
                    <p className="text-xs font-semibold text-gray-800 truncate">{opt.text}</p>
                    {totalV > 0 && (
                      <p className="text-[10px] text-gray-500">{((opt.votes / totalV) * 100).toFixed(0)}%</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : poll.type === 'yesno' ? (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {['Yes', 'No'].map(label => {
                const opt = poll.options.find(o => o.text === label);
                const pct = totalV > 0 && opt ? ((opt.votes / totalV) * 100).toFixed(0) : 0;
                return (
                  <div
                    key={label}
                    className={`text-center p-2 rounded-lg border ${
                      label === 'Yes' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <p className={`text-sm font-bold ${label === 'Yes' ? 'text-green-800' : 'text-red-800'}`}>{label}</p>
                    {totalV > 0 && <p className="text-xs font-semibold mt-0.5">{pct}%</p>}
                  </div>
                );
              })}
            </div>
          ) : poll.type === 'rating' ? (
            <div className="mt-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className={`text-lg ${i <= Math.round(poll.averageRating || 0) ? 'text-amber-500' : 'text-gray-200'}`}>
                    ★
                  </span>
                ))}
              </div>
              {totalV > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {(poll.averageRating || 0).toFixed(1)} / 5 · {totalV} ratings
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              {top2.map(opt => {
                const pct = totalV > 0 ? (opt.votes / totalV) * 100 : 0;
                return (
                  <div key={opt.id} className="relative bg-white rounded-md border border-gray-200 h-8 flex items-center overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-primary/10 rounded-md" style={{ width: `${pct}%` }} />
                    <span className="relative z-10 flex-1 text-xs font-medium text-gray-800 px-2 truncate">{opt.text}</span>
                    {totalV > 0 && (
                      <span className="relative z-10 text-xs font-bold text-primary px-2">{pct.toFixed(0)}%</span>
                    )}
                  </div>
                );
              })}
              {poll.options.length > 2 && (
                <p className="text-xs text-center text-gray-400 mt-1">+{poll.options.length - 2} more options</p>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Footer with creator info and vote button - separate from the main link */}
      <div className="flex items-center justify-between p-3 border-t border-gray-100">
        <Link to={`/profile/${poll.creator.id}`} className="flex items-center gap-2 min-w-0 flex-1 group" onClick={(e) => e.stopPropagation()}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
            {poll.creator.profileImage ? (
              <img src={poll.creator.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              (poll.creator.name?.[0] || 'U').toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate flex items-center gap-1 group-hover:text-primary transition">
              {poll.creator.name}
              {poll.creator.verified && <span className="text-primary text-[10px]">✓</span>}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{totalV.toLocaleString()} votes</span>
          <Link
            to={`/poll/${poll.id}`}
            className="bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm hover:shadow transition"
            onClick={(e) => e.stopPropagation()}
          >
            Vote
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main ExplorePage Component
// ============================================================
export default function ExplorePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [polls, setPolls] = useState({
    trending: [],
    live: [],
    premium: [],
    friends: [],
    for_you: [],
  });
  const [activeSection, setActiveSection] = useState('trending');
  const [activePollType, setActivePollType] = useState('all');
  const [selectedCats, setSelectedCats] = useState(['all']);
  const [showFilters, setShowFilters] = useState(false);
  const [sectionLoading, setSectionLoading] = useState({});
  const [initialDone, setInitialDone] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');
  const [toast, setToast] = useState(null);

  const [potd, setPotd] = useState(null);
  const [potdVotes, setPotdVotes] = useState(0);
  const [timeLeftPotd, setTimeLeftPotd] = useState('');

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Poll of the Day effect
  useEffect(() => {
    const fetchPotd = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const q = query(collection(db, 'polls'), where('isPollOfTheDay', '==', true), where('pollOfTheDayDate', '==', today), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const poll = processDoc(snap.docs[0]);
          setPotd(poll);
          const analyticsSnap = await getDoc(doc(db, 'pollAnalytics', poll.id));
          if (analyticsSnap.exists()) setPotdVotes(analyticsSnap.data().totalVotes || 0);
          const unsubscribe = onSnapshot(doc(db, 'pollAnalytics', poll.id), doc => {
            if (doc.exists()) setPotdVotes(doc.data().totalVotes || 0);
          });
          return () => unsubscribe();
        }
      } catch (err) {
        console.error('POTD fetch error:', err);
      }
    };
    fetchPotd();

    const interval = setInterval(() => {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - Date.now();
      if (diff <= 0) setTimeLeftPotd('Expired');
      else setTimeLeftPotd(`${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSection = useCallback(
    async section => {
      setSectionLoading(prev => ({ ...prev, [section]: true }));
      try {
        const base = collection(db, 'polls');
        const now = Timestamp.now();
        let q;

        switch (section) {
          case 'trending':
            q = query(base, where('visibility', '==', 'public'), orderBy('totalVotes', 'desc'), limit(20));
            break;
          case 'live':
            q = query(base, where('visibility', '==', 'public'), where('meta.isLive', '==', true), where('endsAt', '>', now), orderBy('endsAt', 'asc'), limit(15));
            break;
          case 'premium':
            q = query(base, where('visibility', '==', 'public'), where('meta.isPremium', '==', true), orderBy('createdAt', 'desc'), limit(15));
            break;
          case 'friends': {
            if (!user) {
              setPolls(p => ({ ...p, friends: [] }));
              return;
            }
            const ids = await getFollowing(user.uid);
            if (!ids.length) {
              setPolls(p => ({ ...p, friends: [] }));
              return;
            }
            q = query(base, where('visibility', 'in', ['public', 'friends']), where('creator.id', 'in', ids.slice(0, 10)), orderBy('createdAt', 'desc'), limit(15));
            break;
          }
          case 'for_you': {
            if (!user) {
              setPolls(p => ({ ...p, for_you: [] }));
              return;
            }
            q = query(base, where('visibility', '==', 'public'), orderBy('score24h', 'desc'), limit(15));
            break;
          }
          default:
            return;
        }

        const snap = await getDocs(q);
        let results = snap.docs.map(processDoc);

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
    },
    [user, selectedCats, activePollType]
  );

  // Initial load
  useEffect(() => {
    const sections = ['trending', 'live', 'premium', ...(user ? ['friends', 'for_you'] : [])];
    Promise.all(sections.map(s => fetchSection(s))).finally(() => setInitialDone(true));
  }, [fetchSection, user]);

  // Re-fetch on filter change
  useEffect(() => {
    if (!initialDone) return;
    const timer = setTimeout(() => fetchSection(activeSection), 200);
    return () => clearTimeout(timer);
  }, [selectedCats, activePollType, activeSection, fetchSection, initialDone]);

  const toggleCat = id => {
    if (id === 'all') {
      setSelectedCats(['all']);
      return;
    }
    setSelectedCats(prev => {
      const without = prev.filter(c => c !== 'all');
      return without.includes(id) ? without.filter(c => c !== id) : [...without, id];
    });
  };

  const handleAccessCode = async () => {
    setAccessError('');
    if (!accessCode.trim()) return;
    try {
      const snap = await getDocs(query(collection(db, 'polls'), where('accessCode', '==', accessCode.trim().toUpperCase()), limit(1)));
      if (!snap.empty) {
        navigate(`/poll/${snap.docs[0].id}`);
        setAccessCode('');
      } else {
        setAccessError('No poll found with this code.');
      }
    } catch (err) {
      setAccessError('Failed to validate code.');
    }
  };

  const currentPolls = polls[activeSection] || [];
  const isLoading = sectionLoading[activeSection];

  // Helper to render section chips (used on mobile)
  const renderSectionChips = () => (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {SECTIONS.map(sec => (
        <button
          key={sec.key}
          onClick={() => setActiveSection(sec.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === sec.key
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span className="text-base">{sec.icon}</span>
          <span>{sec.label}</span>
        </button>
      ))}
    </div>
  );

  const renderCategoryChips = () => (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {[{ id: 'all', name: 'All' }, ...CATEGORIES].map(cat => (
        <button
          key={cat.id}
          onClick={() => toggleCat(cat.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedCats.includes(cat.id)
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );

  const renderVerticalSidebar = () => (
    <aside className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 px-1">Sections</p>
        <div className="flex flex-col gap-1">
          {SECTIONS.map(sec => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
                activeSection === sec.key ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{sec.icon}</span>
              {sec.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 px-1">Categories</p>
        <div className="flex flex-col gap-1">
          {[{ id: 'all', name: 'All' }, ...CATEGORIES].map(cat => (
            <button
              key={cat.id}
              onClick={() => toggleCat(cat.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                selectedCats.includes(cat.id) ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 max-w-sm"
          >
            <div className={`rounded-xl px-4 py-3 shadow-lg ${
              toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar for desktop */}
          <div className="hidden lg:block">{renderVerticalSidebar()}</div>

          {/* Main content */}
          <div>
            {/* Mobile: sections and categories as horizontal scrollable chips */}
            <div className="lg:hidden space-y-4 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sections</p>
                {renderSectionChips()}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Categories</p>
                {renderCategoryChips()}
              </div>
            </div>

            {/* Poll of the Day */}
            {potd && (
              <Link
                to={`/poll/${potd.id}`}
                className="block bg-gradient-to-r from-primary to-secondary rounded-xl p-4 mb-6 text-white shadow-md hover:shadow-lg transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold tracking-wide">🌟 TODAY'S POLL</span>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">⏱️ {timeLeftPotd} left</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold mb-1 line-clamp-1">{potd.question}</h3>
                <p className="text-sm opacity-90">{potdVotes.toLocaleString()} voted globally</p>
              </Link>
            )}

            {/* Access code bar */}
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 mb-4 shadow-sm">
              <span className="text-sm">🔑</span>
              <input
                type="text"
                placeholder="Enter private poll access code..."
                value={accessCode}
                onChange={e => {
                  setAccessCode(e.target.value);
                  setAccessError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleAccessCode()}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
              />
              <button
                onClick={handleAccessCode}
                className="bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm hover:shadow transition"
              >
                Go
              </button>
            </div>
            {accessError && <p className="text-xs text-red-500 -mt-2 mb-3">{accessError}</p>}

            {/* Section header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  {SECTIONS.find(s => s.key === activeSection)?.icon}{' '}
                  {SECTIONS.find(s => s.key === activeSection)?.label}
                </h2>
                <p className="text-xs text-gray-400">{currentPolls.length} polls</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition whitespace-nowrap ${
                    showFilters
                      ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {showFilters ? '✕ Hide filters' : '⊞ Filters'}
                </button>
                <Link
                  to="/create"
                  className="flex items-center gap-1 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm hover:shadow transition"
                >
                  + Create Poll
                </Link>
              </div>
            </div>

            {/* Type filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 mb-6">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActivePollType(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      activePollType === f.key
                        ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Polls grid */}
            {isLoading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading polls...</p>
              </div>
            ) : currentPolls.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <p className="text-4xl mb-3">😶</p>
                <p className="text-gray-700 font-semibold">No polls here yet</p>
                {(!user && (activeSection === 'friends' || activeSection === 'for_you')) ? (
                  <Link to="/login" className="inline-block mt-4 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold px-5 py-2 rounded-lg shadow hover:shadow-md transition">
                    Sign in
                  </Link>
                ) : (
                  <Link to="/create" className="inline-block mt-4 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold px-5 py-2 rounded-lg shadow hover:shadow-md transition">
                    Create the first one
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPolls.map(poll => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}