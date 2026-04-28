// src/pages/DashboardPage.jsx – Fully Responsive, same visual style
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { getUserVotes } from '../lib/vote';
import { getMonthlyPollLimit, hasPremiumAnalytics } from '../lib/tierUtils';
import { getPollAnalytics } from '../lib/analytics';
import { formatDate, toDate } from '../lib/utils';

const POLL_TYPE_ICONS = { quick:'⚡', yesno:'✅', rating:'⭐', comparison:'⚖', targeted:'🎯', live:'🔴' };

function StatCard({ icon, value, label, sub, color = '#6C5CE7' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-1 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <p className="text-2xl sm:text-3xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function SimpleBarChart({ data, xKey, yKey, color = '#6C5CE7' }) {
  if (!data || data.length === 0) return <p className="text-center text-gray-500 py-4">Not enough data yet</p>;
  const max = Math.max(...data.map(d => d[yKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span>{item[xKey]}</span>
            <span>{item[yKey]}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(item[yKey] / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myPolls, setMyPolls] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('polls'); // polls | votes | analytics
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');

  // Analytics state
  const [allPolls, setAllPolls] = useState([]);
  const [pollsAnalytics, setPollsAnalytics] = useState({});
  const [analyticsOverview, setAnalyticsOverview] = useState({ totalPolls: 0, totalVotes: 0, totalViews: 0, totalShares: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [trendData, setTrendData] = useState([]);
  const [audienceProfile, setAudienceProfile] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // Load basic data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const pollsSnap = await getDocs(query(collection(db, 'polls'), where('creator.id','==',user.uid), orderBy('createdAt','desc')));
        setMyPolls(pollsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            question: data.question || '',
            type: data.type || 'quick',
            totalVotes: data.totalVotes || 0,
            visibility: data.visibility || 'public',
            createdAt: toDate(data.createdAt) || new Date(),
            endsAt: data.endsAt ? toDate(data.endsAt) : null,
            meta: data.meta || {},
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

  // Load analytics when tab changes
  useEffect(() => {
    if (!user || tab !== 'analytics') return;
    const loadAnalytics = async () => {
      try {
        const pollsSnap = await getDocs(query(collection(db, 'polls'), where('creator.id','==',user.uid), orderBy('createdAt','desc')));
        const pollsList = pollsSnap.docs.map(doc => ({
          id: doc.id,
          question: doc.data().question,
          type: doc.data().type,
          endsAt: doc.data().endsAt ? toDate(doc.data().endsAt) : null,
          meta: doc.data().meta || {},
        }));
        setAllPolls(pollsList);

        const analyticsMap = {};
        let totalVotes = 0, totalViews = 0, totalShares = 0;
        for (const poll of pollsList) {
          const analyticsData = await getPollAnalytics(poll.id, user.tier, user.uid);
          if (analyticsData) {
            analyticsMap[poll.id] = analyticsData;
            totalVotes += analyticsData.totalVotes || 0;
            totalViews += analyticsData.totalViews || 0;
            totalShares += analyticsData.shares || 0;
          }
        }
        setPollsAnalytics(analyticsMap);
        setAnalyticsOverview({ totalPolls: pollsList.length, totalVotes, totalViews, totalShares });

        if (hasPremiumAnalytics(user.tier)) {
          await loadTrendData(pollsList, analyticsMap);
          await loadAudienceProfile(pollsList, analyticsMap);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadAnalytics();
  }, [user, tab]);

  async function loadTrendData(pollsList, analyticsMap) {
    const dailyVotes = {};
    for (const poll of pollsList) {
      const analytics = analyticsMap[poll.id];
      if (analytics && analytics.votesByDay) {
        for (const [day, votes] of Object.entries(analytics.votesByDay)) {
          dailyVotes[day] = (dailyVotes[day] || 0) + votes;
        }
      }
    }
    const sortedDays = Object.entries(dailyVotes).sort((a,b) => a[0].localeCompare(b[0])).slice(-30);
    const trend = sortedDays.map(([day, votes]) => ({ day: day.slice(5), votes }));
    setTrendData(trend);
  }

  async function loadAudienceProfile(pollsList, analyticsMap) {
    const gender = { male: 0, female: 0, other: 0 };
    const age = {};
    const country = {};
    for (const poll of pollsList) {
      const analytics = analyticsMap[poll.id];
      if (analytics) {
        if (analytics.genderCounts) {
          gender.male += analytics.genderCounts.male || 0;
          gender.female += analytics.genderCounts.female || 0;
          gender.other += analytics.genderCounts.other || 0;
        }
        if (analytics.ageBuckets) {
          for (const [bucket, count] of Object.entries(analytics.ageBuckets)) {
            age[bucket] = (age[bucket] || 0) + count;
          }
        }
        if (analytics.countryCounts) {
          for (const [code, count] of Object.entries(analytics.countryCounts)) {
            country[code] = (country[code] || 0) + count;
          }
        }
      }
    }
    setAudienceProfile({
      gender,
      age: Object.entries(age).map(([label, value]) => ({ label, value })),
      topCountries: Object.entries(country).sort((a,b)=>b[1]-a[1]).slice(0,5),
    });
  }

  const handleDelete = async (pollId) => {
    if (!window.confirm('Delete this poll? This cannot be undone.')) return;
    setDeleting(pollId);
    try {
      await deleteDoc(doc(db, 'polls', pollId));
      setMyPolls(prev => prev.filter(p => p.id !== pollId));
      showToast('success', 'Poll deleted.');
    } catch {
      showToast('error', 'Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-bold">Please sign in to view dashboard</p>
        <Link to="/login" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-6 py-3 font-semibold shadow hover:shadow-md transition">Sign in</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  const monthlyLimit = getMonthlyPollLimit(user.tier || 'free');
  const pollsLeft = monthlyLimit === Infinity ? '∞' : Math.max(0, monthlyLimit - (user.pollsThisMonth || 0));
  const usagePct = monthlyLimit === Infinity ? 10 : Math.min(100, ((user.pollsThisMonth || 0) / monthlyLimit) * 100);
  const totalVotesOnMyPolls = myPolls.reduce((s, p) => s + p.totalVotes, 0);

  const filteredPolls = myPolls.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'active') return !p.endsAt || new Date(p.endsAt) > new Date();
    if (filter === 'ended') return p.endsAt && new Date(p.endsAt) <= new Date();
    return true;
  });

  const filteredAnalyticsPolls = allPolls.filter(poll => {
    const isActive = !poll.endsAt || new Date(poll.endsAt) > new Date();
    const isLive = poll.meta?.isLive === true;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return isActive && !isLive;
    if (filterStatus === 'expired') return !isActive && !isLive;
    if (filterStatus === 'live') return isLive;
    return true;
  });

  const tabs = [
    { key: 'polls', label: `My Polls (${myPolls.length})`, icon: '🗳' },
    { key: 'votes', label: `My Votes (${votes.length})`, icon: '✅' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-fade-in">
          <div className={`rounded-xl px-4 py-3 shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {toast.msg}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Desktop layout: grid with sidebar */}
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            {/* User card */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 text-center mb-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary mx-auto flex items-center justify-center text-white text-2xl font-bold overflow-hidden mb-3">
                {user.profileImage ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" /> : (user.name?.[0] || 'U').toUpperCase()}
              </div>
              <p className="font-bold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-400">@{user.username || 'user'}</p>
              <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${
                user.tier === 'premium' || user.tier === 'organization' ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {(user.tier || 'free').charAt(0).toUpperCase() + (user.tier || 'free').slice(1)}
              </span>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 shadow-sm">
              {tabs.map(item => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                    tab === item.key ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <Link to={`/profile/${user.uid}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">👤 View Profile</Link>
                <Link to="/upgrade" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">⭐ Upgrade</Link>
              </div>
            </div>

            {/* Usage */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Monthly usage</p>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{user.pollsThisMonth || 0} polls used</span>
                <span>{monthlyLimit === Infinity ? '∞' : monthlyLimit} total</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${usagePct}%`, background: usagePct >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6C5CE7,#a855f7)' }} />
              </div>
              <p className="text-xs text-gray-500">
                {pollsLeft} remaining
                {user.tier === 'free' && <Link to="/upgrade" className="text-primary font-semibold ml-1">· Upgrade</Link>}
              </p>
            </div>
          </aside>

          {/* Main content */}
          <div>
            {/* Mobile header: user summary + tabs as chips */}
            <div className="lg:hidden mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                  {user.profileImage ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" /> : (user.name?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400">@{user.username || 'user'}</p>
                </div>
              </div>
              {/* Usage bar mobile */}
              <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 shadow-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Monthly polls: {user.pollsThisMonth || 0} / {monthlyLimit === Infinity ? '∞' : monthlyLimit}</span>
                  {pollsLeft !== '∞' && <span>{pollsLeft} left</span>}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${usagePct}%`, background: usagePct >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6C5CE7,#a855f7)' }} />
                </div>
              </div>
              {/* Tabs as scrollable chips */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      tab === item.key ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.name?.split(' ')[0] || 'there'}! 👋</p>
              </div>
              <Link to="/create" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-4 py-2 text-sm font-bold shadow hover:shadow-md transition flex items-center gap-1">
                + Create Poll
              </Link>
            </div>

            {/* Stats cards (except analytics tab) */}
            {tab !== 'analytics' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon="🗳" value={myPolls.length} label="Polls created" sub="All time" />
                <StatCard icon="📊" value={totalVotesOnMyPolls.toLocaleString()} label="Votes received" sub="Across all polls" />
                <StatCard icon="✅" value={votes.length} label="Votes cast" sub="By you" />
                <StatCard icon="📅" value={pollsLeft} label="Polls left" sub="This month" color={typeof pollsLeft === 'number' && pollsLeft <= 1 ? '#ef4444' : '#6C5CE7'} />
              </div>
            )}

            {/* Polls Tab */}
            {tab === 'polls' && (
              <>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  {['all', 'active', 'ended'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition whitespace-nowrap ${
                        filter === f ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                {filteredPolls.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <p className="text-5xl mb-3">🗳</p>
                    <p className="font-semibold text-gray-600 mb-4">No polls yet</p>
                    <Link to="/create" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 py-2 text-sm font-bold shadow">Create your first poll</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPolls.map(poll => {
                      const isActive = !poll.endsAt || new Date(poll.endsAt) > new Date();
                      return (
                        <div key={poll.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 transition-shadow hover:shadow-md">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                            {POLL_TYPE_ICONS[poll.type] || '🗳'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link to={`/poll/${poll.id}`} className="font-bold text-gray-800 hover:text-primary line-clamp-1">{poll.question}</Link>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                              <span>📅 {formatDate(poll.createdAt)}</span>
                              <span>👥 {poll.totalVotes.toLocaleString()} votes</span>
                              <span className={`flex items-center gap-1 ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                {isActive ? 'Active' : 'Ended'}
                              </span>
                              {poll.meta?.isLive && <span className="text-red-500 font-bold">🔴 Live</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Link to={`/create?edit=${poll.id}`} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">✏️</Link>
                            <button onClick={() => handleDelete(poll.id)} disabled={deleting === poll.id} className="w-8 h-8 rounded-lg border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-50">
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

            {/* Votes Tab */}
            {tab === 'votes' && (
              <>
                {votes.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <p className="text-5xl mb-3">✅</p>
                    <p className="font-semibold text-gray-600 mb-4">You haven't voted yet</p>
                    <Link to="/explore" className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 py-2 text-sm font-bold shadow">Browse Polls</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {votes.slice(0, 20).map(vote => (
                      <div key={vote.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 truncate">Poll: {vote.pollId}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Option voted: <strong className="text-primary">{vote.optionId}</strong>
                            {vote.isAnonymous && <span className="ml-2 text-gray-400">· Anonymous</span>}
                          </p>
                        </div>
                        <Link to={`/poll/${vote.pollId}`} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg shrink-0">View →</Link>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Analytics Tab */}
            {tab === 'analytics' && (
              <div>
                {/* Overview stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <StatCard icon="🗳" value={analyticsOverview.totalPolls} label="Total Polls" />
                  <StatCard icon="📊" value={analyticsOverview.totalVotes.toLocaleString()} label="Total Votes" />
                  <StatCard icon="👁" value={analyticsOverview.totalViews.toLocaleString()} label="Total Views" />
                  <StatCard icon="📤" value={analyticsOverview.totalShares.toLocaleString()} label="Shares" />
                </div>

                {/* Filter chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['all', 'active', 'expired', 'live'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                        filterStatus === status ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Polls table (horizontal scroll on mobile) */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto mb-6">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Poll</th>
                        <th className="px-4 py-3 text-center">Vote Rate</th>
                        <th className="px-4 py-3 text-center">Votes</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnalyticsPolls.map(poll => {
                        const analyticsItem = pollsAnalytics[poll.id];
                        const voteRate = analyticsItem?.totalViews ? ((analyticsItem.totalVotes / analyticsItem.totalViews) * 100).toFixed(1) : 0;
                        return (
                          <tr key={poll.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-800">{poll.question}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{voteRate}%</td>
                            <td className="px-4 py-3 text-center text-gray-600">{analyticsItem?.totalVotes || 0}</td>
                            <td className="px-4 py-3 text-center">
                              <Link to={`/poll/analytics/${poll.id}`} className="text-primary bg-primary/10 px-3 py-1 rounded-full text-xs font-semibold inline-block hover:bg-primary/20 transition">View Analytics</Link>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAnalyticsPolls.length === 0 && (
                        <tr><td colSpan="4" className="text-center py-8 text-gray-500">No polls found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Premium analytics features */}
                {hasPremiumAnalytics(user.tier) && (
                  <>
                    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
                      <h3 className="font-bold text-gray-800 mb-4">Engagement Trend (Last 30 Days)</h3>
                      <SimpleBarChart data={trendData} xKey="day" yKey="votes" />
                    </div>
                    {audienceProfile && (
                      <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-800 mb-4">Audience Profile</h3>
                        <div className="mb-3">
                          <p className="font-semibold text-sm mb-1">Gender</p>
                          <p className="text-sm text-gray-600">Male: {audienceProfile.gender.male} · Female: {audienceProfile.gender.female} · Other: {audienceProfile.gender.other}</p>
                        </div>
                        <div className="mb-3">
                          <p className="font-semibold text-sm mb-1">Age</p>
                          {audienceProfile.age.length > 0 ? (
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              {audienceProfile.age.map(({ label, value }) => <span key={label}>{label}: {value}</span>)}
                            </div>
                          ) : <span className="text-sm text-gray-500">No age data yet</span>}
                        </div>
                        <div>
                          <p className="font-semibold text-sm mb-1">Top Countries</p>
                          {audienceProfile.topCountries.length > 0 ? (
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              {audienceProfile.topCountries.map(([code, count]) => <span key={code}>{code}: {count}</span>)}
                            </div>
                          ) : <span className="text-sm text-gray-500">No country data yet</span>}
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