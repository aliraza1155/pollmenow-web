// src/pages/DashboardPage.jsx – dark/light mode aware
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { db } from '../lib/firebase';
import { collection, query, where, doc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { getUserVotes } from '../lib/vote';
import { getMonthlyPollLimit, hasPremiumAnalytics } from '../lib/tierUtils';
import { getPollAnalytics } from '../lib/analytics';
import { formatDate, toDate } from '../lib/utils';
import { canEditPoll, canCreatePoll, canViewAdvancedAnalytics } from '../lib/permissions';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', live:'🔴' };

// ─── Sub-components ──────────────────────────────────────────
function StatCard({ icon, value, label, sub, color = '#6C5CE7' }) {
  return (
    <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-4 flex flex-col gap-1 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <p className="text-2xl sm:text-3xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function SimpleBarChart({ data, xKey, yKey, color = '#6C5CE7' }) {
  if (!data || data.length === 0)
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">Not enough data yet</p>;
  const max = Math.max(...data.map(d => d[yKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-700 dark:text-gray-300">{item[xKey]}</span>
            <span className="text-gray-600 dark:text-gray-400">{item[yKey]}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(item[yKey] / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Shared pill/chip classes
const pillBase   = 'px-3 py-1 rounded-full text-xs font-semibold border transition whitespace-nowrap';
const pillActive = 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-sm';
const pillIdle   = 'bg-white dark:bg-[#0f1120] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5';

// ─── Main ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }   = useAuth();
  const { activeAccount, organizations } = useAccount();
  const navigate   = useNavigate();

  const [myPolls,          setMyPolls]          = useState([]);
  const [votes,            setVotes]            = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [tab,              setTab]              = useState('polls');
  const [deleting,         setDeleting]         = useState(null);
  const [toast,            setToast]            = useState(null);
  const [filter,           setFilter]           = useState('all');
  const [organizationInfo, setOrganizationInfo] = useState(null);

  const [allPolls,            setAllPolls]            = useState([]);
  const [pollsAnalytics,      setPollsAnalytics]      = useState({});
  const [analyticsOverview,   setAnalyticsOverview]   = useState({ totalPolls:0, totalVotes:0, totalViews:0, totalShares:0 });
  const [filterStatus,        setFilterStatus]        = useState('all');
  const [trendData,           setTrendData]           = useState([]);
  const [audienceProfile,     setAudienceProfile]     = useState(null);
  const [loadingAnalytics,    setLoadingAnalytics]    = useState(false);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  // Org info
  useEffect(() => {
    if (activeAccount && activeAccount !== 'personal') {
      const unsub = onSnapshot(doc(db, 'organizations', activeAccount), snap => {
        setOrganizationInfo(snap.exists() ? snap.data() : null);
      });
      return () => unsub();
    } else {
      setOrganizationInfo(null);
    }
  }, [activeAccount]);

  const activeOrg   = activeAccount !== 'personal' ? organizations.find(o => o.id === activeAccount) : null;
  const canCreate   = canCreatePoll(user, activeAccount, activeAccount !== 'personal' ? activeAccount : null);
  let canViewAnalyticsTab = activeAccount === 'personal' || user?.memberships?.[activeAccount] != null;
  const currentOrgRole   = activeAccount !== 'personal' ? user?.memberships?.[activeAccount]?.role : null;
  const canViewAdvanced  = canViewAdvancedAnalytics(currentOrgRole) && hasPremiumAnalytics(user?.tier);

  // Polls listener
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const pollsQuery = activeAccount === 'personal'
      ? query(collection(db, 'polls'), where('creator.id','==',user.uid))
      : query(collection(db, 'polls'), where('context.type','==','organization'), where('context.orgId','==',activeAccount));

    const unsub = onSnapshot(pollsQuery, snap => {
      setMyPolls(snap.docs.map(d => ({
        id: d.id,
        question:   d.data().question || '',
        type:       d.data().type || 'quick',
        totalVotes: d.data().totalVotes || 0,
        visibility: d.data().visibility || 'public',
        createdAt:  d.data().createdAt ? toDate(d.data().createdAt) : new Date(),
        endsAt:     d.data().endsAt ? toDate(d.data().endsAt) : null,
        meta:       d.data().meta || {},
        accessCode: d.data().accessCode,
        context:    d.data().context || { type: 'personal' },
      })));
      setLoading(false);
    }, err => { showToast('error', 'Failed to load polls: ' + err.message); setLoading(false); });
    return () => unsub();
  }, [user, activeAccount]);

  // Votes
  useEffect(() => {
    if (!user) return;
    getUserVotes(user.uid).then(setVotes).catch(() => setVotes([]));
  }, [user]);

  // Analytics
  useEffect(() => {
    if (!user || tab !== 'analytics' || !canViewAnalyticsTab) return;
    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const snap = await getDocs(
          activeAccount === 'personal'
            ? query(collection(db,'polls'), where('creator.id','==',user.uid), where('context.type','==','personal'))
            : query(collection(db,'polls'), where('context.type','==','organization'), where('context.orgId','==',activeAccount))
        );
        const pollsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllPolls(pollsList);
        const analyticsMap = {};
        let totalVotes = 0, totalViews = 0, totalShares = 0;
        for (const poll of pollsList) {
          const a = await getPollAnalytics(poll.id, user.tier, user.uid);
          if (a) { analyticsMap[poll.id] = a; totalVotes += a.totalVotes || 0; totalViews += a.totalViews || 0; totalShares += a.shares || 0; }
        }
        setPollsAnalytics(analyticsMap);
        setAnalyticsOverview({ totalPolls: pollsList.length, totalVotes, totalViews, totalShares });
        if (canViewAdvanced && hasPremiumAnalytics(user.tier)) {
          // Trend data
          const dailyVotes = {};
          for (const poll of pollsList) {
            const a = analyticsMap[poll.id];
            if (a?.votesByDay) for (const [day, v] of Object.entries(a.votesByDay)) dailyVotes[day] = (dailyVotes[day]||0) + v;
          }
          setTrendData(Object.entries(dailyVotes).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([day,votes])=>({ day: day.slice(5), votes })));
          // Audience
          const gender = { male:0, female:0, other:0 }; const age = {}; const country = {};
          for (const poll of pollsList) {
            const a = analyticsMap[poll.id];
            if (!a) continue;
            if (a.genderCounts) { gender.male += a.genderCounts.male||0; gender.female += a.genderCounts.female||0; gender.other += a.genderCounts.other||0; }
            if (a.ageBuckets) for (const [b,c] of Object.entries(a.ageBuckets)) age[b] = (age[b]||0)+c;
            if (a.countryCounts) for (const [c,n] of Object.entries(a.countryCounts)) country[c] = (country[c]||0)+n;
          }
          setAudienceProfile({ gender, age: Object.entries(age).map(([label,value])=>({label,value})), topCountries: Object.entries(country).sort((a,b)=>b[1]-a[1]).slice(0,5) });
        }
      } catch (err) { showToast('error', 'Failed to load analytics'); }
      finally { setLoadingAnalytics(false); }
    };
    loadAnalytics();
  }, [user, tab, activeAccount, canViewAnalyticsTab, canViewAdvanced]);

  const handleDelete = async (pollId, poll) => {
    if (!canEditPoll(user, poll)) { showToast('error', 'No permission to delete this poll.'); return; }
    if (!window.confirm('Delete this poll permanently?')) return;
    setDeleting(pollId);
    try { await deleteDoc(doc(db, 'polls', pollId)); showToast('success', 'Poll deleted.'); }
    catch { showToast('error', 'Delete failed.'); }
    finally { setDeleting(null); }
  };

  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-[#f0f0ff]">Please sign in</p>
        <Link to="/login" className="text-primary underline">Login</Link>
      </div>
    </div>
  );
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#08091a]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  const totalPollsInContext       = myPolls.length;
  const totalVotesReceivedInContext = myPolls.reduce((sum, p) => sum + (p.totalVotes || 0), 0);
  const totalVotesCastByUser      = votes.length;

  let pollsLeftValue, usagePercentage, monthlyLimitDisplay;
  if (activeAccount !== 'personal') {
    pollsLeftValue = '∞'; usagePercentage = 10; monthlyLimitDisplay = '∞';
  } else {
    const limit = getMonthlyPollLimit(user.tier);
    const used  = user.pollsThisMonth || 0;
    pollsLeftValue = Math.max(0, limit - used);
    usagePercentage = Math.min(100, (used / limit) * 100);
    monthlyLimitDisplay = limit === Infinity ? '∞' : limit;
  }

  const filteredPolls = myPolls.filter(p => {
    if (filter === 'all')    return true;
    if (filter === 'active') return !p.endsAt || new Date(p.endsAt) > new Date();
    if (filter === 'ended')  return p.endsAt && new Date(p.endsAt) <= new Date();
    return true;
  });

  const filteredAnalyticsPolls = allPolls.filter(poll => {
    const isActive = !poll.endsAt || new Date(poll.endsAt) > new Date();
    const isLive   = poll.meta?.isLive === true;
    if (filterStatus === 'all')     return true;
    if (filterStatus === 'active')  return isActive && !isLive;
    if (filterStatus === 'expired') return !isActive && !isLive;
    if (filterStatus === 'live')    return isLive;
    return true;
  });

  const tabs = [
    { key: 'polls',     label: `${activeAccount === 'personal' ? 'Personal' : organizationInfo?.name || 'Org'} Polls (${totalPollsInContext})`, icon: '🗳' },
    { key: 'votes',     label: `My Votes (${totalVotesCastByUser})`, icon: '✅' },
    ...(canViewAnalyticsTab ? [{ key: 'analytics', label: 'Analytics', icon: '📊' }] : []),
  ];

  // ── Avatar block ──
  const AvatarBlock = ({ src, name, sub, badge }) => (
    <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-5 text-center mb-4 shadow-sm">
      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary mx-auto flex items-center justify-center text-white text-2xl font-bold overflow-hidden mb-3">
        {src ? <img src={src} className="w-full h-full object-cover" alt="" /> : (name?.[0] || 'U').toUpperCase()}
      </div>
      <p className="font-bold text-gray-800 dark:text-gray-100">{name}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
      {badge && (
        <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white">{badge}</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#08091a]">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-20 }} className="fixed top-20 right-4 z-50 max-w-sm">
            <div className={`rounded-xl px-4 py-3 shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-400/12 border border-green-200 dark:border-green-400/25 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-400/12 border border-red-200 dark:border-red-400/25 text-red-800 dark:text-red-300'
            }`}>{toast.msg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block">
            {activeAccount === 'personal' ? (
              <AvatarBlock
                src={user.profileImage} name={user.name} sub={`@${user.username || 'user'}`}
                badge={(user.tier || 'free').charAt(0).toUpperCase() + (user.tier || 'free').slice(1)}
              />
            ) : organizationInfo ? (
              <AvatarBlock src={organizationInfo.logo} name={organizationInfo.name} sub="Organization" badge="Team" />
            ) : (
              <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-5 text-center mb-4 text-gray-400 dark:text-gray-500">Loading…</div>
            )}

            <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-3 mb-4 shadow-sm">
              {tabs.map(item => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                    tab === item.key
                      ? 'bg-primary/10 dark:bg-primary/15 text-primary'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
              <div className="border-t border-gray-100 dark:border-white/7 mt-2 pt-2">
                <Link to={`/profile/${user.uid}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">👤 View Profile</Link>
                <Link to="/upgrade" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">⭐ Upgrade</Link>
              </div>
            </div>

            {activeAccount === 'personal' && (
              <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Monthly usage</p>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{user.pollsThisMonth || 0} polls used</span>
                  <span>{monthlyLimitDisplay} total</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width:`${usagePercentage}%`, background: usagePercentage >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6C5CE7,#a855f7)' }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pollsLeftValue === '∞' ? 'Unlimited' : `${pollsLeftValue} remaining`}
                  {user.tier === 'free' && <Link to="/upgrade" className="text-primary font-semibold ml-1">· Upgrade</Link>}
                </p>
              </div>
            )}
          </aside>

          {/* ── Main content ── */}
          <div>
            {/* Mobile header */}
            <div className="lg:hidden mb-5">
              {activeAccount === 'personal' ? (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                    {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt="" /> : (user.name?.[0]||'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">@{user.username||'user'}</p>
                  </div>
                </div>
              ) : organizationInfo && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                    {organizationInfo.logo ? <img src={organizationInfo.logo} className="w-full h-full object-cover" alt="" /> : (organizationInfo.name?.[0]||'O').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-100">{organizationInfo.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Organization</p>
                  </div>
                </div>
              )}
              {activeAccount === 'personal' && (
                <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-3 mb-4 shadow-sm">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Monthly polls: {user.pollsThisMonth || 0} / {monthlyLimitDisplay}</span>
                    {pollsLeftValue !== '∞' && <span>{pollsLeftValue} left</span>}
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${usagePercentage}%`, background: usagePercentage >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6C5CE7,#a855f7)' }} />
                  </div>
                </div>
              )}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      tab === item.key ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm' : 'bg-white dark:bg-[#0f1120] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{item.icon}</span> {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-[#f0f0ff]">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Welcome back, {activeAccount === 'personal' ? user.name?.split(' ')[0] || 'User' : organizationInfo?.name?.split(' ')[0] || 'Organization'}! 👋
                </p>
                {activeAccount !== 'personal' && <p className="text-xs text-primary mt-1">Viewing <strong>{organizationInfo?.name}</strong></p>}
              </div>
              {canCreate && (
                <Link to="/create" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-4 py-2 text-sm font-bold shadow hover:shadow-md hover:opacity-90 transition flex items-center gap-1">
                  + Create Poll
                </Link>
              )}
            </div>

            {/* Stat cards */}
            {tab !== 'analytics' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon="🗳" value={totalPollsInContext} label="Polls created" sub={activeAccount === 'personal' ? 'By you' : 'In organization'} />
                <StatCard icon="📊" value={totalVotesReceivedInContext.toLocaleString()} label="Votes received" sub="Across this context" />
                <StatCard icon="✅" value={totalVotesCastByUser} label="Votes cast" sub="By you" />
                <StatCard
                  icon="📅"
                  value={pollsLeftValue === '∞' ? '∞' : pollsLeftValue}
                  label="Polls left"
                  sub={activeAccount === 'personal' ? 'This month' : 'Unlimited plan'}
                  color={typeof pollsLeftValue === 'number' && pollsLeftValue <= 1 ? '#ef4444' : '#6C5CE7'}
                />
              </div>
            )}

            {/* ── POLLS TAB ── */}
            {tab === 'polls' && (
              <>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  {['all','active','ended'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`${pillBase} ${filter === f ? pillActive : pillIdle}`}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))}
                </div>

                {filteredPolls.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8">
                    <p className="text-5xl mb-3">🗳</p>
                    <p className="font-semibold text-gray-600 dark:text-gray-400 mb-4">No polls in this context</p>
                    {canCreate && <Link to="/create" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 py-2 text-sm font-bold shadow">Create your first poll</Link>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPolls.map(poll => {
                      const isActive  = !poll.endsAt || new Date(poll.endsAt) > new Date();
                      const canDelete = canEditPoll(user, poll);
                      return (
                        <div key={poll.id} className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-4 flex flex-wrap items-center gap-3 transition-shadow hover:shadow-md dark:hover:shadow-black/30">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-xl flex-shrink-0">
                            {POLL_TYPE_ICONS[poll.type] || '🗳'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link to={`/poll/${poll.id}`} className="font-bold text-gray-800 dark:text-gray-100 hover:text-primary line-clamp-1">
                              {poll.question}
                            </Link>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1">
                              <span>📅 {formatDate(poll.createdAt)}</span>
                              <span>👥 {poll.totalVotes.toLocaleString()} votes</span>
                              <span className={`flex items-center gap-1 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                {isActive ? 'Active' : 'Ended'}
                              </span>
                              {poll.meta?.isLive && <span className="text-red-500 dark:text-red-400 font-bold">🔴 Live</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {canDelete && <Link to={`/create?edit=${poll.id}`} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">✏️</Link>}
                            {canDelete && (
                              <button onClick={() => handleDelete(poll.id, poll)} disabled={deleting === poll.id} className="w-8 h-8 rounded-lg border border-red-200 dark:border-red-400/25 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10">
                                {deleting === poll.id ? '⏳' : '🗑️'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── VOTES TAB ── */}
            {tab === 'votes' && (
              votes.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8">
                  <p className="text-5xl mb-3">✅</p>
                  <p className="font-semibold text-gray-600 dark:text-gray-400 mb-4">You haven't voted yet</p>
                  <Link to="/explore" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 py-2 text-sm font-bold shadow">Browse Polls</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {votes.slice(0, 20).map(vote => (
                    <div key={vote.id} className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">Poll: {vote.pollId}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Option: <strong className="text-primary">{vote.optionId}</strong>
                          {vote.isAnonymous && <span className="ml-2 text-gray-400 dark:text-gray-500">· Anonymous</span>}
                        </p>
                      </div>
                      <Link to={`/poll/${vote.pollId}`} className="text-xs font-bold text-primary bg-primary/10 dark:bg-primary/15 px-3 py-1.5 rounded-lg shrink-0">
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── ANALYTICS TAB ── */}
            {tab === 'analytics' && canViewAnalyticsTab && (
              <div>
                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <StatCard icon="🗳" value={analyticsOverview.totalPolls} label="Total Polls" />
                  <StatCard icon="📊" value={analyticsOverview.totalVotes.toLocaleString()} label="Total Votes" />
                  <StatCard icon="👁" value={analyticsOverview.totalViews.toLocaleString()} label="Total Views" />
                  <StatCard icon="📤" value={analyticsOverview.totalShares.toLocaleString()} label="Shares" />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['all','active','expired','live'].map(status => (
                    <button key={status} onClick={() => setFilterStatus(status)} className={`${pillBase} ${filterStatus === status ? pillActive : pillIdle}`}>
                      {status.charAt(0).toUpperCase()+status.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 overflow-x-auto mb-6">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[#161829]">
                      <tr>
                        {['Poll','Vote Rate','Votes','Views','Action'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-semibold text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnalyticsPolls.map(poll => {
                        const a       = pollsAnalytics[poll.id];
                        const voteRate = a?.totalViews ? ((a.totalVotes / a.totalViews) * 100).toFixed(1) : 0;
                        return (
                          <tr key={poll.id} className="border-t border-gray-100 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/3 transition">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">{poll.question}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{voteRate}%</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a?.totalVotes || 0}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a?.totalViews || 0}</td>
                            <td className="px-4 py-3">
                              <Link to={`/poll/analytics/${poll.id}`} className="text-primary bg-primary/10 dark:bg-primary/15 px-3 py-1 rounded-full text-xs font-semibold hover:bg-primary/20 transition">
                                View →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAnalyticsPolls.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">No polls found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Advanced analytics */}
                {canViewAdvanced && (
                  <>
                    <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-5 mb-6">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Engagement Trend (Last 30 Days)</h3>
                      <SimpleBarChart data={trendData} xKey="day" yKey="votes" />
                    </div>
                    {audienceProfile && (
                      <div className="bg-white dark:bg-[#0f1120] rounded-xl border border-gray-100 dark:border-white/8 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Audience Profile</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">Gender</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Male: {audienceProfile.gender.male} · Female: {audienceProfile.gender.female} · Other: {audienceProfile.gender.other}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">Age groups</p>
                            {audienceProfile.age.length > 0
                              ? <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">{audienceProfile.age.map(({label,value})=>(<span key={label}>{label}: {value}</span>))}</div>
                              : <span className="text-sm text-gray-500 dark:text-gray-500">No age data yet</span>
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">Top countries</p>
                            {audienceProfile.topCountries.length > 0
                              ? <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">{audienceProfile.topCountries.map(([code,count])=>(<span key={code}>{code}: {count}</span>))}</div>
                              : <span className="text-sm text-gray-500 dark:text-gray-500">No country data yet</span>
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}