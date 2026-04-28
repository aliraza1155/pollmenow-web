// src/pages/PollAnalyticsPage.jsx – Full analytics with export, premium insights, and responsive design
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getPollAnalytics } from '../lib/analytics';
import { generatePollInsights } from '../lib/ai';
import { hasPremiumAnalytics } from '../lib/tierUtils';
import { toDate, formatDate } from '../lib/utils';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

// BarChart component (pure CSS, responsive)
const BarChart = ({ data, xKey, yKey, color = '#6C5CE7' }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 py-8">Not enough data yet</p>;
  }
  const max = Math.max(...data.map(d => d[yKey]), 1);
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs sm:text-sm mb-1">
            <span className="text-gray-600">{item[xKey]}</span>
            <span className="font-semibold text-primary">{item[yKey]}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item[yKey] / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// DonutChart component
const DonutChart = ({ data, total }) => {
  const colors = ['#6C5CE7', '#D63DE8', '#A855F7'];
  let cumulative = 0;
  const circumference = 283; // 2 * pi * 45 ≈ 283

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90">
          {data.map((item, i) => {
            const percent = (item.value / total) * 100;
            const dash = circumference;
            const dashArray = `${(percent / 100) * dash} ${dash}`;
            const offset = cumulative;
            cumulative += (percent / 100) * dash;
            return (
              <circle
                key={i}
                cx="50%"
                cy="50%"
                r="45"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="10"
                strokeDasharray={dashArray}
                strokeDashoffset={dash - offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-800">
          {total}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-xs sm:text-sm text-gray-700">
              {item.label} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PollAnalyticsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gender');
  const [timeRange, setTimeRange] = useState('24h');
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const containerRef = useRef(null);

  // Fetch poll and analytics
  useEffect(() => {
    const fetch = async () => {
      const pollDoc = await getDoc(doc(db, 'polls', id));
      if (!pollDoc.exists()) {
        alert('Poll not found');
        navigate('/');
        return;
      }
      const pollData = pollDoc.data();
      if (pollData.creator.id !== user?.uid) {
        alert('You are not the creator of this poll');
        navigate('/');
        return;
      }
      setPoll({ id: pollDoc.id, ...pollData });
      const analyticsData = await getPollAnalytics(id, user?.tier, user?.uid);
      setAnalytics(analyticsData);
      setLoading(false);
    };
    if (user && id) fetch();

    // Real‑time updates
    const unsubscribe = onSnapshot(doc(db, 'pollAnalytics', id), async () => {
      const fresh = await getPollAnalytics(id, user?.tier, user?.uid);
      setAnalytics(fresh);
    });
    return () => unsubscribe();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!poll || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">No analytics data available yet.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const isLive = poll.meta?.isLive;
  const totalVotes = analytics.totalVotes || 0;
  const totalViews = analytics.totalViews || 0;
  const shares = analytics.shares || 0;
  const countriesCount = Object.keys(analytics.countryCounts || {}).length;
  const lastHourVotes = Object.values(analytics.votesByHour || {}).slice(-1)[0] || 0;
  const voteRate = totalViews ? ((totalVotes / totalViews) * 100).toFixed(1) : 0;

  // Option results with vote counts
  const optionResults = (poll.options || []).map(opt => ({
    id: opt.id,
    text: opt.text,
    votes: (analytics.optionDemographics?.[opt.id]?.genderCounts?.male || 0) +
           (analytics.optionDemographics?.[opt.id]?.genderCounts?.female || 0) +
           (analytics.optionDemographics?.[opt.id]?.genderCounts?.other || 0),
  }));
  const maxVotes = Math.max(...optionResults.map(o => o.votes), 1);

  // Gender data for donut
  const genderData = analytics.genderCounts
    ? Object.entries(analytics.genderCounts).map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: v }))
    : [];

  // Age buckets
  const ageData = analytics.ageBuckets ? Object.entries(analytics.ageBuckets).map(([k, v]) => ({ bucket: k, count: v })) : [];

  // Top countries
  const countryData = analytics.countryCounts ? Object.entries(analytics.countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10) : [];

  // Age buckets list for heatmap
  const ageBuckets = ['18-24', '25-34', '35-44', '45-54', '55+'];
  const optionsLabels = (poll.options || []).map(o => o.text);
  const heatmapData = {};
  for (const age of ageBuckets) {
    heatmapData[age] = {};
    for (const opt of poll.options) {
      const optDemo = analytics.optionDemographics?.[opt.id]?.ageBuckets || {};
      const bucketVotes = optDemo[age] || 0;
      const totalAgeVotes = (analytics.ageBuckets?.[age]) || 1;
      heatmapData[age][opt.text] = (bucketVotes / totalAgeVotes) * 100;
    }
  }

  // Gender × Option data
  const genderOptionData = (poll.options || []).map(opt => ({
    option: opt.text,
    male: analytics.optionDemographics?.[opt.id]?.genderCounts?.male || 0,
    female: analytics.optionDemographics?.[opt.id]?.genderCounts?.female || 0,
    other: analytics.optionDemographics?.[opt.id]?.genderCounts?.other || 0,
  }));

  // Top country per option
  const topCountryPerOption = (poll.options || []).map(opt => {
    const countries = analytics.optionDemographics?.[opt.id]?.countryCounts || {};
    const top = Object.entries(countries).sort((a, b) => b[1] - a[1])[0];
    return { option: opt.text, countryCode: top?.[0], percent: top?.[1] };
  });

  // Chart data for votes over time
  const votesByHour = analytics.votesByHour || {};
  const hourKeys = Object.keys(votesByHour).sort();
  const chartData = timeRange === '24h'
    ? hourKeys.slice(-24).map(k => ({ label: k.slice(11, 13), votes: votesByHour[k] }))
    : Object.entries(analytics.votesByDay || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([k, v]) => ({ label: k.slice(5), votes: v }));

  // Export functions
  const exportPNG = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current);
      canvas.toBlob(blob => saveAs(blob, `poll-${id}-analytics.png`));
    } catch (err) {
      alert('Failed to capture image');
    }
  };

  const exportPDF = () => {
    window.print();
  };

  const exportCSV = () => {
    let csv = 'Option,Votes,Percentage\n';
    optionResults.forEach(opt => {
      const pct = totalVotes ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
      csv += `"${opt.text.replace(/"/g, '""')}",${opt.votes},${pct}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `poll-${id}-analytics.csv`);
  };

  const handleAIInsight = async () => {
    setGeneratingInsight(true);
    try {
      const insight = await generatePollInsights(id);
      setAnalytics(prev => ({ ...prev, aiInsight: insight }));
    } catch (err) {
      alert('Failed to generate insight: ' + err.message);
    } finally {
      setGeneratingInsight(false);
    }
  };

  const isPremium = hasPremiumAnalytics(user?.tier);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div ref={containerRef} className="max-w-6xl mx-auto space-y-6">
        {/* Print styles */}
        <style>
          {`
            @media print {
              .no-print, button, .export-actions, nav, footer {
                display: none !important;
              }
              body { background: white; }
              .analytics-print { break-inside: avoid; }
            }
          `}
        </style>

        {/* Header with gradient banner */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold">Analytics</h1>
            <div className="export-actions flex gap-2">
              <button onClick={exportPNG} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm font-semibold transition">
                📸 PNG
              </button>
              <button onClick={exportPDF} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm font-semibold transition">
                🖨️ Print / PDF
              </button>
              {isPremium && (
                <button onClick={exportCSV} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm font-semibold transition">
                  📊 CSV
                </button>
              )}
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-bold mt-3 break-words">{poll.question}</h2>
          <div className="flex flex-wrap gap-3 mt-2 text-xs sm:text-sm opacity-90">
            <span>{isLive ? '🔴 LIVE' : (poll.endsAt && new Date() > toDate(poll.endsAt) ? '⏰ EXPIRED' : '🟢 ACTIVE')}</span>
            <span>Created: {formatDate(poll.createdAt)}</span>
            {poll.endsAt && <span>Ends: {formatDate(poll.endsAt)}</span>}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Votes', value: totalVotes.toLocaleString(), sub: `+${lastHourVotes} last hour`, color: '#6C5CE7' },
            { label: 'Total Views', value: totalViews.toLocaleString(), sub: `Vote rate: ${voteRate}%`, color: '#6C5CE7' },
            { label: 'Shares', value: shares.toLocaleString(), sub: '', color: '#6C5CE7' },
            { label: 'Countries', value: countriesCount, sub: '', color: '#6C5CE7' },
          ].map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100"
            >
              <div className="text-2xl font-extrabold text-primary">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
              {kpi.sub && <div className="text-[10px] text-green-600 mt-0.5">{kpi.sub}</div>}
            </motion.div>
          ))}
        </div>

        {/* Votes over time */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h3 className="font-bold text-gray-800">Votes Over Time</h3>
            <div className="flex gap-2">
              {['24h', 'all'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    timeRange === range
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range === '24h' ? 'Last 24h' : 'Last 30 days'}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={chartData} xKey="label" yKey="votes" />
        </div>

        {/* Results (option breakdown) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Results</h3>
          <div className="space-y-4">
            {optionResults.map((opt, idx) => {
              const pct = totalVotes ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
              const isWinner = opt.votes === maxVotes;
              return (
                <div key={opt.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{opt.text}</span>
                    <span>{opt.votes} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isWinner ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-primary/30'
                      }`}
                      style={{ width: `${(opt.votes / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demographics section with tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200">
            {['gender', 'age', 'country', 'byOption'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'byOption' ? 'By Option' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div className="p-5">
            {activeTab === 'gender' && (
              <div>
                {genderData.length > 0 ? (
                  <DonutChart data={genderData} total={totalVotes} />
                ) : (
                  <p className="text-center text-gray-500 py-8">No gender data yet</p>
                )}
              </div>
            )}
            {activeTab === 'age' && (
              <div>
                {ageData.length > 0 ? (
                  <BarChart data={ageData} xKey="bucket" yKey="count" />
                ) : (
                  <p className="text-center text-gray-500 py-8">No age data yet</p>
                )}
              </div>
            )}
            {activeTab === 'country' && (
              <div>
                {countryData.length > 0 ? (
                  <div className="space-y-3">
                    {countryData.map(([code, count]) => {
                      const pct = totalVotes ? ((count / totalVotes) * 100).toFixed(1) : 0;
                      return (
                        <div key={code}>
                          <div className="flex justify-between text-sm">
                            <span>{code}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No country data yet</p>
                )}
              </div>
            )}
            {activeTab === 'byOption' && (
              <div>
                {!isPremium ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-2xl mb-2">🔒</p>
                    <p className="font-semibold text-gray-700">Option‑level demographics are a Premium feature.</p>
                    <a href="/upgrade" className="inline-block mt-4 bg-primary text-white rounded-full px-5 py-2 text-sm font-bold shadow hover:shadow-md transition">
                      Upgrade to Premium
                    </a>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary per option */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Option Summary</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(poll.options || []).map(opt => {
                          const totalOpt = (analytics.optionDemographics?.[opt.id]?.genderCounts?.male || 0) +
                                           (analytics.optionDemographics?.[opt.id]?.genderCounts?.female || 0) +
                                           (analytics.optionDemographics?.[opt.id]?.genderCounts?.other || 0);
                          const pct = totalVotes ? ((totalOpt / totalVotes) * 100).toFixed(1) : 0;
                          const ageBuck = analytics.optionDemographics?.[opt.id]?.ageBuckets || {};
                          const dominantAge = Object.entries(ageBuck).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                          const gender = analytics.optionDemographics?.[opt.id]?.genderCounts || {};
                          const dominantGender = Object.entries(gender).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                          const country = Object.entries(analytics.optionDemographics?.[opt.id]?.countryCounts || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                          return (
                            <div key={opt.id} className="bg-gray-50 rounded-xl p-3">
                              <p className="font-bold text-gray-800">{opt.text}</p>
                              <p className="text-sm">{totalOpt} votes ({pct}%)</p>
                              <p className="text-xs text-primary mt-1">
                                Mostly {dominantAge} {dominantGender} from {country}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Age × Option Heatmap */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Age × Option Heatmap</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 border border-gray-200 bg-gray-50">Age</th>
                              {optionsLabels.map(col => (
                                <th key={col} className="p-2 border border-gray-200 bg-gray-50">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ageBuckets.map(age => (
                              <tr key={age}>
                                <td className="p-2 border border-gray-200 font-semibold">{age}</td>
                                {optionsLabels.map(col => {
                                  const pct = heatmapData[age]?.[col] || 0;
                                  const intensity = Math.min(0.9, pct / 100);
                                  return (
                                    <td
                                      key={col}
                                      className="p-2 border border-gray-200 text-center"
                                      style={{ backgroundColor: `rgba(108,92,231,${intensity})` }}
                                    >
                                      {pct.toFixed(1)}%
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Gender × Option */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Gender × Option</h4>
                      {genderOptionData.map(item => {
                        const total = item.male + item.female + item.other;
                        return (
                          <div key={item.option} className="mb-4">
                            <div className="text-sm font-medium mb-1">{item.option}</div>
                            <div className="flex h-6 rounded-full overflow-hidden">
                              <div className="bg-primary flex items-center justify-center text-white text-[10px]" style={{ width: `${(item.male / total) * 100}%` }}>
                                {item.male > 0 ? `${Math.round((item.male / total) * 100)}%` : ''}
                              </div>
                              <div className="bg-secondary flex items-center justify-center text-white text-[10px]" style={{ width: `${(item.female / total) * 100}%` }}>
                                {item.female > 0 ? `${Math.round((item.female / total) * 100)}%` : ''}
                              </div>
                              <div className="bg-purple-500 flex items-center justify-center text-white text-[10px]" style={{ width: `${(item.other / total) * 100}%` }}>
                                {item.other > 0 ? `${Math.round((item.other / total) * 100)}%` : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Top country per option */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Top Country per Option</h4>
                      <div className="space-y-2">
                        {topCountryPerOption.map(item => (
                          <div key={item.option} className="flex justify-between border-b border-gray-100 py-2">
                            <span>{item.option}</span>
                            <span className="font-medium">{item.countryCode || '—'} {item.percent ? `(${item.percent} votes)` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Insight (premium) */}
        {isPremium && (
          <div className="bg-white rounded-xl border-l-4 border-primary shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">✨</span>
              <h3 className="font-bold text-gray-800">AI Insight</h3>
              <span className="bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Premium
              </span>
            </div>
            {analytics.aiInsight ? (
              <>
                <p className="text-gray-700">{analytics.aiInsight.text}</p>
                <div className="mt-3 bg-purple-50 rounded-lg p-3">
                  <span className="text-sm font-semibold">💡 Suggestion:</span>
                  <p className="text-sm text-gray-700 mt-1">{analytics.aiInsight.suggestion}</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-gray-600 mb-3">Generate AI‑powered insights for this poll.</p>
                <button
                  onClick={handleAIInsight}
                  disabled={generatingInsight}
                  className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-md transition disabled:opacity-50"
                >
                  {generatingInsight ? 'Generating...' : 'Generate Insight'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}