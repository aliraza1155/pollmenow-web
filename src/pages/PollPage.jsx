// src/pages/PollPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { usePoll } from '../hooks/usePoll';
import { submitVote, hasUserVoted } from '../lib/vote';
import { isFollowing, followUser, unfollowUser } from '../lib/follow';
import { getPollAnalytics } from '../lib/analytics';
import { hasPremiumAnalytics, requiresLoginToVote } from '../lib/tierUtils';
import { formatDate } from '../lib/utils';
import { trackPollView } from '../lib/viewTracker';
import ShareWidget from '../components/ShareWidget';

const TYPE_META = {
  quick: { label: '⚡ Quick Poll', cls: 'bg-amber-50 text-amber-800' },
  yesno: { label: '✅ Yes / No', cls: 'bg-green-50 text-green-800' },
  rating: { label: '⭐ Rating Poll', cls: 'bg-orange-50 text-orange-800' },
  comparison: { label: '⚖ Comparison', cls: 'bg-blue-50 text-blue-800' },
  targeted: { label: '🎯 Targeted Poll', cls: 'bg-purple-50 text-purple-800' },
  live: { label: '🔴 Live Poll', cls: 'bg-red-50 text-red-800' },
};

function CreatorAvatar({ creator, size = 44 }) {
  return (
    <div
      className="rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {creator.profileImage ? (
        <img src={creator.profileImage} alt="" className="w-full h-full object-cover" />
      ) : (
        (creator.name?.[0] || 'U').toUpperCase()
      )}
    </div>
  );
}

export default function PollPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { poll, loading: pollLoading, error } = usePoll(id);

  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [voteAnonymously, setVoteAnonymously] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  // Detect permission error (non‑logged‑in user trying to view a restricted poll)
  useEffect(() => {
    if (error && (error.includes('permission-denied') || error.includes('Missing or insufficient permissions'))) {
      setPermissionError(true);
    } else {
      setPermissionError(false);
    }
  }, [error]);

  useEffect(() => {
    if (!poll) return;
    const check = async () => {
      if (user) {
        setIsCreator(user.uid === poll.creator.id);
        const [fol, voted] = await Promise.all([
          isFollowing(poll.creator.id, user.uid),
          hasUserVoted(poll.id, user.uid, poll.anonymous),
        ]);
        setIsFollowingCreator(fol);
        setHasVoted(voted);
      } else if (poll.anonymous) {
        // Only check anonymous vote if poll allows anonymous voting
        setHasVoted(await hasUserVoted(poll.id, undefined, true));
      }
      trackPollView(poll.id, user?.uid).catch(() => {});
    };
    check();
  }, [poll, user]);

  useEffect(() => {
    if (!poll) return;
    if (user?.uid === poll.creator.id || hasPremiumAnalytics(user?.tier)) {
      getPollAnalytics(poll.id, user?.tier || 'free', user?.uid)
        .then(setAnalytics)
        .catch(() => {});
    }
  }, [poll, user]);

  const notify = (type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleVote = async () => {
    if (!selectedOption) {
      notify('error', 'Please select an option first.');
      return;
    }
    if (hasVoted) {
      notify('error', 'You already voted in this poll.');
      return;
    }
    if (poll.visibility === 'private' && accessCode !== poll.accessCode && !isCreator) {
      notify('error', 'Invalid access code.');
      return;
    }
    if (poll.visibility === 'friends' && !isFollowingCreator && !isCreator) {
      notify('error', 'You must follow the creator to vote.');
      return;
    }
    setVoting(true);
    try {
      await submitVote(
  poll.id,
  selectedOption,
  user?.uid,
  voteAnonymously && poll.visibility !== 'private',
  poll.visibility === 'private' ? accessCode : undefined,
  poll.creator?.tier || 'free'
);
      setHasVoted(true);
      notify('success', 'Your vote has been recorded! 🎉');
    } catch (err) {
      if (err.message?.includes('Login required')) {
        setShowAuthModal(true);
      } else {
        notify('error', err.message || 'Failed to submit vote.');
      }
    } finally {
      setVoting(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (isCreator) return;
    setFollowingLoading(true);
    try {
      if (isFollowingCreator) {
        await unfollowUser(poll.creator.id, user.uid);
        setIsFollowingCreator(false);
      } else {
        await followUser(poll.creator.id, user.uid);
        setIsFollowingCreator(true);
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setFollowingLoading(false);
    }
  };

  if (pollLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading poll...</p>
        </div>
      </div>
    );
  }

  // Permission error: poll exists but user not allowed to read
  if (permissionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Sign in to view this poll</h2>
          <p className="text-gray-500 mb-6">This poll is restricted. Please sign in to continue.</p>
          <Link to="/login" className="inline-block bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-6 py-2 font-semibold shadow">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-5xl mb-3">🤔</p>
          <p className="text-lg font-bold text-gray-800">Poll not found</p>
          <Link to="/explore" className="inline-block mt-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 py-2 text-sm font-bold shadow hover:shadow-md transition">
            Browse polls
          </Link>
        </div>
      </div>
    );
  }

  const totalVotes = poll.totalVotes || 0;
  const isExpired = poll.endsAt && new Date(poll.endsAt) < new Date();
  const canVote = !hasVoted && !isExpired;
  const showResults = hasVoted || isExpired || isCreator;
  const typeMeta = TYPE_META[poll.type] || TYPE_META.quick;
  const isMillionPlus = totalVotes >= 1_000_000;
  const loginRequiredToVote = requiresLoginToVote(poll.creator?.tier || 'free');
  const votingDisabledBecauseLogin = !user && loginRequiredToVote && !poll.anonymous;

  const renderOptions = () => {
    if (poll.type === 'rating') {
      const scale = poll.scale || { min: 1, max: 5, step: 1 };
      const ratings = [];
      for (let i = scale.min; i <= scale.max; i += scale.step) ratings.push(i);
      return (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-3">
            Rate from {scale.min} to {scale.max}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {ratings.map(r => (
              <button
                key={r}
                disabled={!canVote || votingDisabledBecauseLogin}
                onClick={() => setSelectedOption(r.toString())}
                className={`w-12 h-12 rounded-full border-2 transition-all duration-150 ${
                  selectedOption === r.toString()
                    ? 'border-primary bg-gradient-to-r from-primary to-secondary text-white scale-110'
                    : 'border-gray-200 bg-white text-gray-800'
                } ${canVote && !votingDisabledBecauseLogin ? 'cursor-pointer' : 'cursor-default'} font-bold text-base`}
              >
                {r}
              </button>
            ))}
          </div>
          {showResults && poll.averageRating > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2 flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <span className="text-sm font-bold text-amber-800">
                Average: {poll.averageRating.toFixed(1)} / {poll.scale?.max || 5}
              </span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {poll.options.map(opt => {
          const pct = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
          const selected = selectedOption === opt.id;
          const hasImg = opt.mediaUrl;
          return (
            <div
              key={opt.id}
              onClick={() => canVote && !votingDisabledBecauseLogin && setSelectedOption(opt.id)}
              className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                selected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
              } ${canVote && !votingDisabledBecauseLogin ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className={`relative flex flex-col sm:flex-row items-center gap-3 ${hasImg ? 'p-0' : 'p-4'}`}>
                {hasImg && (
                  <div className="w-full sm:w-40 h-40 sm:h-40 flex-shrink-0 overflow-hidden rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none">
                    <img
                      src={opt.mediaUrl}
                      alt={opt.text}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className={`flex-1 flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3 ${hasImg ? 'p-4' : ''}`}>
                  <div className="flex items-center gap-3">
                    {canVote && !votingDisabledBecauseLogin && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selected ? 'border-primary bg-primary' : 'border-gray-300 bg-transparent'
                        }`}
                      >
                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                    )}
                    <span className={`text-base ${selected ? 'font-semibold text-primary-dark' : 'font-medium text-gray-800'}`}>
                      {opt.text}
                    </span>
                  </div>
                  {showResults && (
                    <span className="text-sm font-bold text-primary ml-2 sm:ml-0 whitespace-nowrap">
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              {showResults && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/10">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 max-w-sm w-full"
          >
            <div
              className={`rounded-xl px-4 py-3 shadow-lg ${
                notification.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {notification.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition mb-5"
            >
              ← Back
            </button>

            <div className="bg-gray-50 rounded-2xl p-5 mb-4">
              <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full mb-3 ${typeMeta.cls}`}>
                {typeMeta.label}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                {poll.question}
              </h1>
              {poll.description && (
                <p className="text-sm text-gray-500 mt-2">{poll.description}</p>
              )}
            </div>

            {poll.questionMedia && (
              <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
                {poll.questionMedia.type === 'image' ? (
                  <img src={poll.questionMedia.url} alt="" className="w-full max-h-96 object-cover" />
                ) : (
                  <div className="bg-gray-900 h-48 flex items-center justify-center text-white text-sm">
                    ▶ Video content
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3 mb-5">
              <Link to={`/profile/${poll.creator.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <CreatorAvatar creator={poll.creator} size={42} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1 flex-wrap">
                    {poll.creator.name}
                    {poll.creator.verified && <span className="text-primary text-xs">✓</span>}
                    {(poll.creator.tier === 'premium' || poll.creator.tier === 'organization') && (
                      <span className="text-xs">⭐</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {totalVotes.toLocaleString()} votes · {formatDate(poll.createdAt)}
                  </p>
                </div>
              </Link>
              <div className="flex gap-2 flex-shrink-0">
                {!isCreator && (
                  <button
                    onClick={handleFollow}
                    disabled={followingLoading}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      isFollowingCreator
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                        : 'border border-primary text-primary hover:bg-primary/5'
                    } ${followingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {followingLoading ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1" />
                    ) : isFollowingCreator ? '✓ Following' : '+ Follow'}
                  </button>
                )}
                {isCreator && (
                  <Link
                    to={`/poll/analytics/${poll.id}`}
                    className="rounded-full px-4 py-1.5 text-xs font-bold border border-primary text-primary hover:bg-primary/5 transition inline-flex items-center gap-1"
                  >
                    📊 Analytics
                  </Link>
                )}
              </div>
            </div>

            {poll.visibility === 'private' && !hasVoted && !isCreator && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 mb-4">
                <span>🔑</span>
                <input
                  type="text"
                  placeholder="Enter access code..."
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
                />
              </div>
            )}

            {poll.anonymous && poll.visibility !== 'private' && !hasVoted && (
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <div
                  onClick={() => setVoteAnonymously(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
                    voteAnonymously ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      voteAnonymously ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-xs text-gray-600">Vote anonymously</span>
              </label>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                {showResults ? 'Results' : 'Cast your vote'}
              </p>
              {renderOptions()}
            </div>

            {votingDisabledBecauseLogin && canVote && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-amber-600">🔐</span>
                <span className="text-sm text-amber-800">You must sign in to vote on this poll.</span>
                <Link to="/login" className="ml-auto text-primary font-semibold text-sm">Sign in</Link>
              </div>
            )}

            {canVote && !votingDisabledBecauseLogin && (
              <button
                onClick={handleVote}
                disabled={!selectedOption || voting}
                className={`w-full mt-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-3 font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 ${
                  !selectedOption ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {voting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Vote'
                )}
              </button>
            )}

            {isExpired && (
              <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm font-semibold text-red-700">
                ⏰ This poll has ended
              </div>
            )}
            {hasVoted && !isExpired && (
              <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm font-semibold text-green-700">
                ✅ You've voted in this poll
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowShare(true)}
                className="flex-1 bg-primary/10 text-primary rounded-xl py-2.5 text-sm font-bold hover:bg-primary/20 transition"
              >
                📤 Share Poll
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/poll/${poll.id}`);
                  notify('success', 'Link copied!');
                }}
                className="flex-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-200 transition"
              >
                🔗 Copy Link
              </button>
            </div>

            {isMillionPlus && (
              <div className="mt-5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="font-extrabold text-amber-800">1 Million Votes!</p>
                  <p className="text-sm text-amber-700">{totalVotes.toLocaleString()} total votes</p>
                  {poll.prizeAwarded && (
                    <p className="text-xs text-primary font-bold mt-1">$100 prize awarded 💰</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">Poll info</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-semibold ${isExpired ? 'text-red-500' : 'text-green-500'}`}>
                    {isExpired ? '⏰ Ended' : '🟢 Active'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total votes</span>
                  <span className="font-semibold text-gray-800">{totalVotes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Visibility</span>
                  <span className="font-semibold text-gray-800 capitalize">{poll.visibility}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span className="font-semibold text-gray-800">{formatDate(poll.createdAt)}</span>
                </div>
                {poll.endsAt && !isExpired && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ends</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(poll.endsAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Anonymous</span>
                  <span className="font-semibold text-gray-800">{poll.anonymous ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {analytics ? (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1">📊 Analytics</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-extrabold text-primary">
                      {analytics.totalVotes?.toLocaleString() || '—'}
                    </p>
                    <p className="text-[10px] text-gray-500">Votes</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-extrabold text-primary">
                      {analytics.totalViews?.toLocaleString() || '—'}
                    </p>
                    <p className="text-[10px] text-gray-500">Views</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-extrabold text-primary">
                      {((analytics.participationRate || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gray-500">Rate</p>
                  </div>
                </div>
              </div>
            ) : !hasPremiumAnalytics(user?.tier) && !isCreator ? (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-primary/20 rounded-xl p-4 text-center">
                <span className="text-2xl">📊</span>
                <p className="text-sm font-extrabold text-indigo-800 mt-2 mb-1">Advanced Analytics</p>
                <p className="text-xs text-purple-700 mb-3">
                  Get demographic breakdowns, engagement rates, and geographic heatmaps.
                </p>
                <Link
                  to="/upgrade"
                  className="inline-block bg-gradient-to-r from-primary to-secondary text-white rounded-full px-4 py-1.5 text-xs font-bold shadow hover:shadow-md transition"
                >
                  Explore Premium
                </Link>
              </div>
            ) : null}

            {poll.tags?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-bold text-gray-800 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {poll.tags.map(tag => (
                    <span
                      key={tag}
                      className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShare(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowShare(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
              >
                ✕
              </button>
              <div className="p-6">
                <ShareWidget
                  poll={{ id: poll.id, question: poll.question, accessCode: poll.accessCode }}
                  onShare={() => setShowShare(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-5xl mb-3">🔐</p>
              <p className="text-lg font-extrabold text-gray-800 mb-2">Sign in required</p>
              <p className="text-sm text-gray-500 mb-5">Please sign in to vote and access all features.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="flex-1 border border-gray-300 bg-white rounded-xl py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Later
                </button>
                <Link
                  to="/login"
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-2 text-sm font-bold shadow hover:shadow-md transition text-center"
                >
                  Sign in
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}