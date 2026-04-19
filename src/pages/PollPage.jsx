// src/pages/PollPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePoll } from '../hooks/usePoll';
import { submitVote, hasUserVoted } from '../lib/vote';
import { isFollowing, followUser, unfollowUser } from '../lib/follow';
import { getPollAnalytics } from '../lib/analytics';
import { hasPremiumAnalytics } from '../lib/tierUtils';
import { formatDate } from '../lib/utils';
import { trackPollView } from '../lib/viewTracker';
import ShareWidget from '../components/ShareWidget';

/* ─── helpers ─────────────────────────────────────────── */
const TYPE_META = {
  quick:      { label: '⚡ Quick Poll',    cls: 'badge-quick'      },
  yesno:      { label: '✅ Yes / No',      cls: 'badge-yesno'      },
  rating:     { label: '⭐ Rating Poll',   cls: 'badge-rating'     },
  comparison: { label: '⚖ Comparison',    cls: 'badge-comparison' },
  targeted:   { label: '🎯 Targeted Poll', cls: 'badge-targeted'   },
  live:       { label: '🔴 Live Poll',     cls: 'badge-live'       },
};

function CreatorAvatar({ creator, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#6C5CE7,#a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.3, fontWeight: 700, overflow: 'hidden',
    }}>
      {creator.profileImage
        ? <img src={creator.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (creator.name?.[0] || 'U').toUpperCase()
      }
    </div>
  );
}

/* ─── Main component ──────────────────────────────────── */
export default function PollPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { poll, loading: pollLoading, error } = usePoll(id);

  const [selectedOption,    setSelectedOption]    = useState(null);
  const [hasVoted,          setHasVoted]          = useState(false);
  const [voting,            setVoting]            = useState(false);
  const [accessCode,        setAccessCode]        = useState('');
  const [isFollowingCreator,setIsFollowingCreator]= useState(false);
  const [isCreator,         setIsCreator]         = useState(false);
  const [voteAnonymously,   setVoteAnonymously]   = useState(false);
  const [analytics,         setAnalytics]         = useState(null);
  const [showShare,         setShowShare]         = useState(false);
  const [showAuthModal,     setShowAuthModal]     = useState(false);
  const [notification,      setNotification]      = useState(null); // { type, msg }

  /* check status when poll loads */
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
        setHasVoted(await hasUserVoted(poll.id, undefined, true));
      }
      trackPollView(poll.id, user?.uid).catch(() => {});
    };
    check();
  }, [poll, user]);

  /* analytics */
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
    if (!selectedOption) { notify('error', 'Please select an option first.'); return; }
    if (hasVoted)         { notify('error', 'You already voted in this poll.'); return; }
    if (poll.visibility === 'private' && accessCode !== poll.accessCode && !isCreator) {
      notify('error', 'Invalid access code.'); return;
    }
    if (poll.visibility === 'friends' && !isFollowingCreator && !isCreator) {
      notify('error', 'You must follow the creator to vote.'); return;
    }
    setVoting(true);
    try {
      await submitVote(poll.id, selectedOption, user?.uid,
        voteAnonymously && poll.visibility !== 'private',
        poll.visibility === 'private' ? accessCode : undefined,
        poll.creator.tier,
      );
      setHasVoted(true);
      notify('success', 'Your vote has been recorded! 🎉');
    } catch (err) {
      if (err.message?.includes('Login required')) { setShowAuthModal(true); }
      else notify('error', err.message || 'Failed to submit vote.');
    } finally {
      setVoting(false);
    }
  };

  const handleFollow = async () => {
    if (!user) { setShowAuthModal(true); return; }
    if (isCreator) return;
    try {
      if (isFollowingCreator) {
        await unfollowUser(poll.creator.id, user.uid);
        setIsFollowingCreator(false);
      } else {
        await followUser(poll.creator.id, user.uid);
        setIsFollowingCreator(true);
      }
    } catch (err) { notify('error', err.message); }
  };

  /* ── loading / error states ── */
  if (pollLoading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#9898a8' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e8e8ee', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      Loading poll...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (error || !poll) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 48 }}>🤔</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>Poll not found</p>
      <Link to="/explore" style={{ background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Browse polls</Link>
    </div>
  );

  const totalVotes   = poll.totalVotes || 0;
  const isExpired    = poll.endsAt && new Date(poll.endsAt) < new Date();
  const canVote      = !hasVoted && !isExpired;
  const showResults  = hasVoted || isExpired || isCreator;
  const typeMeta     = TYPE_META[poll.type] || TYPE_META.quick;
  const isMillionPlus = totalVotes >= 1_000_000;

  /* ── vote options renderer ── */
  const renderOptions = () => {
    if (poll.type === 'rating') {
      const scale   = poll.scale || { min: 1, max: 5, step: 1 };
      const ratings = [];
      for (let i = scale.min; i <= scale.max; i += scale.step) ratings.push(i);
      return (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#9898a8', marginBottom: 12 }}>Rate from {scale.min} to {scale.max}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            {ratings.map(r => (
              <button
                key={r}
                disabled={!canVote}
                onClick={() => setSelectedOption(r.toString())}
                style={{
                  width: 48, height: 48, borderRadius: '50%', border: '2px solid',
                  borderColor: selectedOption === r.toString() ? '#6C5CE7' : '#e8e8ee',
                  background:  selectedOption === r.toString() ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : '#fff',
                  color:        selectedOption === r.toString() ? '#fff' : '#111',
                  fontSize: 16, fontWeight: 700, cursor: canVote ? 'pointer' : 'default',
                  transition: 'all .15s',
                  transform: selectedOption === r.toString() ? 'scale(1.12)' : 'scale(1)',
                }}
              >{r}</button>
            ))}
          </div>
          {showResults && poll.averageRating > 0 && (
            <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 16px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Average: {poll.averageRating.toFixed(1)} / {poll.scale?.max || 5}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {poll.options.map(opt => {
          const pct      = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
          const selected = selectedOption === opt.id;
          const hasImg   = opt.mediaUrl;
          return (
            <div
              key={opt.id}
              onClick={() => canVote && setSelectedOption(opt.id)}
              style={{
                position: 'relative', borderRadius: 12, border: '1.5px solid',
                borderColor: selected ? '#6C5CE7' : '#e8e8ee',
                background: selected ? '#f5f3ff' : '#fff',
                overflow: 'hidden', cursor: canVote ? 'pointer' : 'default',
                transition: 'border-color .15s, background .15s',
              }}
            >
              {/* result fill */}
              {showResults && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: selected ? 'rgba(108,92,231,.12)' : 'rgba(108,92,231,.06)', transition: 'width .5s ease' }} />
              )}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: hasImg ? '0' : '12px 16px' }}>
                {hasImg && (
                  <img src={opt.mediaUrl} alt={opt.text} style={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, padding: hasImg ? '12px 16px 12px 0' : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {canVote && (
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', border: '2px solid',
                        borderColor: selected ? '#6C5CE7' : '#d0d0d0',
                        background: selected ? '#6C5CE7' : 'transparent',
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    )}
                    <span style={{ fontSize: 14, fontWeight: selected ? 600 : 500, color: selected ? '#4c3db0' : '#111' }}>{opt.text}</span>
                  </div>
                  {showResults && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6C5CE7', flexShrink: 0, marginLeft: 8 }}>{pct.toFixed(0)}%</span>
                  )}
                </div>
              </div>
              {showResults && (
                <div style={{ height: 3, background: 'rgba(108,92,231,.08)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6C5CE7,#a855f7)', transition: 'width .5s ease' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Toast notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 80, right: 20, zIndex: 999,
          background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: notification.type === 'success' ? '#14532d' : '#7f1d1d',
          borderRadius: 12, padding: '12px 18px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.1)',
          animation: 'pmn-fadeUp .25s ease',
        }}>
          {notification.msg}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>

        {/* ── Left: main poll ── */}
        <div>
          {/* Back */}
          <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#6C5CE7', background: '#f0eeff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', marginBottom: 20 }}>
            ← Back
          </button>

          {/* Question card */}
          <div style={{ background: '#f7f7fb', borderRadius: 16, padding: '20px 22px', marginBottom: 16 }}>
            <span className={`type-badge ${typeMeta.cls}`} style={{ marginBottom: 12, display: 'inline-flex' }}>{typeMeta.label}</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111118', lineHeight: 1.3, marginBottom: poll.description ? 8 : 0 }}>{poll.question}</h1>
            {poll.description && <p style={{ fontSize: 14, color: '#6b6b7b', lineHeight: 1.6, margin: 0 }}>{poll.description}</p>}
          </div>

          {/* Media */}
          {poll.questionMedia && (
            <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--pmn-border)' }}>
              {poll.questionMedia.type === 'image'
                ? <img src={poll.questionMedia.url} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                : <div style={{ background: '#111', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>▶ Video content</div>
              }
            </div>
          )}

          {/* Creator */}
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to={`/user/${poll.creator.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1, minWidth: 0 }}>
              <CreatorAvatar creator={poll.creator} size={42} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {poll.creator.name}
                  {poll.creator.verified && <span style={{ color: '#6C5CE7', fontSize: 12 }}>✓</span>}
                  {(poll.creator.tier === 'premium' || poll.creator.tier === 'organization') && <span style={{ fontSize: 12 }}>⭐</span>}
                </p>
                <p style={{ fontSize: 12, color: '#9898a8', margin: 0 }}>
                  {totalVotes.toLocaleString()} votes · {formatDate(poll.createdAt)}
                </p>
              </div>
            </Link>
            {!isCreator && (
              <button
                onClick={handleFollow}
                style={{
                  flexShrink: 0, borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: isFollowingCreator ? 'none' : '1.5px solid #6C5CE7',
                  background: isFollowingCreator ? 'linear-gradient(135deg,#6C5CE7,#a855f7)' : 'transparent',
                  color: isFollowingCreator ? '#fff' : '#6C5CE7',
                  transition: 'all .15s',
                }}
              >
                {isFollowingCreator ? '✓ Following' : '+ Follow'}
              </button>
            )}
          </div>

          {/* Access code */}
          {poll.visibility === 'private' && !hasVoted && !isCreator && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🔑</span>
              <input
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: '#111' }}
                placeholder="Enter access code..."
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
              />
            </div>
          )}

          {/* Anonymous toggle */}
          {poll.anonymous && poll.visibility !== 'private' && !hasVoted && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
              <div
                onClick={() => setVoteAnonymously(v => !v)}
                style={{
                  width: 40, height: 22, borderRadius: 11, background: voteAnonymously ? '#6C5CE7' : '#e8e8ee',
                  position: 'relative', transition: 'background .2s', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <div style={{ position: 'absolute', top: 2, left: voteAnonymously ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
              </div>
              <span style={{ fontSize: 13, color: '#6b6b7b', fontWeight: 500 }}>Vote anonymously</span>
            </label>
          )}

          {/* Options */}
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '20px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#9898a8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>
              {showResults ? 'Results' : 'Cast your vote'}
            </p>
            {renderOptions()}
          </div>

          {/* Vote button */}
          {canVote && (
            <button
              onClick={handleVote}
              disabled={!selectedOption || voting}
              style={{
                width: '100%', marginTop: 14, background: !selectedOption ? '#e8e8ee' : 'linear-gradient(135deg,#6C5CE7,#a855f7)',
                color: !selectedOption ? '#aaa' : '#fff',
                border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800,
                cursor: !selectedOption ? 'not-allowed' : 'pointer',
                transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {voting ? (
                <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Submitting...</>
              ) : 'Submit Vote'}
            </button>
          )}

          {/* Status messages */}
          {isExpired && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#991b1b' }}>
              ⏰ This poll has ended
            </div>
          )}
          {hasVoted && !isExpired && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#14532d' }}>
              ✅ You've voted in this poll
            </div>
          )}

          {/* Share buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowShare(true)} style={{ flex: 1, background: '#f0eeff', color: '#6C5CE7', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📤 Share Poll
            </button>
            <button
              onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/poll/${poll.id}`); notify('success', 'Link copied!'); }}
              style={{ flex: 1, background: '#f7f7fb', color: '#6b6b7b', border: '1px solid var(--pmn-border)', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              🔗 Copy Link
            </button>
          </div>

          {/* 1M achievement */}
          {isMillionPlus && (
            <div style={{ marginTop: 20, background: 'linear-gradient(135deg,#fff7ed,#fffbeb)', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 32 }}>🏆</span>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#92400e', margin: 0 }}>1 Million Votes!</p>
                <p style={{ fontSize: 13, color: '#b45309', margin: 0 }}>{totalVotes.toLocaleString()} total votes</p>
                {poll.prizeAwarded && <p style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 700, margin: '4px 0 0' }}>$100 prize awarded 💰</p>}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Poll info */}
          <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '18px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 14 }}>Poll info</p>
            {[
              { label: 'Status',     value: isExpired ? '⏰ Ended' : '🟢 Active', color: isExpired ? '#ef4444' : '#22c55e' },
              { label: 'Total votes',value: totalVotes.toLocaleString() },
              { label: 'Visibility', value: poll.visibility.charAt(0).toUpperCase() + poll.visibility.slice(1) },
              { label: 'Created',    value: formatDate(poll.createdAt) },
              ...(poll.endsAt && !isExpired ? [{ label: 'Ends', value: new Date(poll.endsAt).toLocaleDateString() }] : []),
              { label: 'Anonymous',  value: poll.anonymous ? 'Yes' : 'No' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f4f4f6' }}>
                <span style={{ fontSize: 12, color: '#9898a8' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.color || '#111' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Analytics */}
          {analytics ? (
            <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>📊 Analytics</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { val: analytics.totalVotes?.toLocaleString() || '—', lbl: 'Votes'  },
                  { val: analytics.totalViews?.toLocaleString() || '—', lbl: 'Views'  },
                  { val: `${((analytics.participationRate || 0) * 100).toFixed(1)}%`, lbl: 'Rate' },
                ].map(item => (
                  <div key={item.lbl} style={{ background: '#f7f7fb', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#6C5CE7', margin: 0 }}>{item.val}</p>
                    <p style={{ fontSize: 10, color: '#9898a8', margin: '2px 0 0' }}>{item.lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : !hasPremiumAnalytics(user?.tier) && !isCreator ? (
            <div style={{ background: 'linear-gradient(135deg,#f0eeff,#fce8ff)', border: '1px solid #ddd6fe', borderRadius: 16, padding: '18px', textAlign: 'center' }}>
              <span style={{ fontSize: 28 }}>📊</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#5b21b6', marginTop: 8, marginBottom: 6 }}>Advanced Analytics</p>
              <p style={{ fontSize: 12, color: '#7c3aed', marginBottom: 14 }}>Get demographic breakdowns, engagement rates, and geographic heatmaps.</p>
              <Link to="/upgrade" style={{ display: 'block', background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Explore Premium</Link>
            </div>
          ) : null}

          {/* Tags */}
          {poll.tags?.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid var(--pmn-border)', borderRadius: 16, padding: '18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {poll.tags.map(tag => (
                  <span key={tag} style={{ background: '#f0eeff', color: '#5b21b6', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 500 }}>#{tag}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Share modal */}
      {showShare && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 380, width: '100%', position: 'relative' }}>
            <button onClick={() => setShowShare(false)} style={{ position: 'absolute', top: 14, right: 14, background: '#f4f4f6', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#6b6b7b' }}>✕</button>
            <ShareWidget poll={{ id: poll.id, question: poll.question, accessCode: poll.accessCode }} onShare={() => setShowShare(false)} />
          </div>
        </div>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🔐</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 8 }}>Sign in required</p>
            <p style={{ fontSize: 13, color: '#9898a8', marginBottom: 22 }}>Please sign in to vote and access all features.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAuthModal(false)} style={{ flex: 1, border: '1px solid #e8e8ee', background: '#fff', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#6b6b7b' }}>Later</button>
              <Link to="/login" style={{ flex: 1, background: 'linear-gradient(135deg,#6C5CE7,#a855f7)', color: '#fff', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>Sign in</Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pmn-fadeUp { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 768px) {
          .poll-detail-grid { grid-template-columns: 1fr !important; }
          aside { display: none; }
        }
      `}</style>
    </div>
  );
}