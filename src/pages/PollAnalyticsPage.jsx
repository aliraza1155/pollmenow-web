// src/pages/PollAnalyticsPage.jsx – Clean production version with unflatten and zero‑vote placeholders
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generatePollInsights } from '../lib/ai';
import { hasPremiumAnalytics } from '../lib/tierUtils';
import { toDate, formatDate } from '../lib/utils';
import { canViewAnalytics, canViewAdvancedAnalytics } from '../lib/permissions';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';

const computeRegressionLine = (data, yKey) => {
  const n = data.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i][yKey] || 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return data.map((point, i) => ({ ...point, trend: slope * i + intercept }));
};

// Convert flattened object with dotted keys into nested object
function unflatten(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

export default function PollAnalyticsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const containerRef = useRef(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const pollDoc = await getDoc(doc(db, 'polls', id));
      if (!pollDoc.exists()) {
        alert('Poll not found');
        navigate('/');
        return;
      }
      const pollData = pollDoc.data();

      if (!canViewAnalytics(user, pollData)) {
        alert('No permission to view analytics');
        navigate('/');
        return;
      }

      let role = null;
      if (pollData.context?.type === 'organization' && user) {
        role = user.memberships?.[pollData.context.orgId]?.role || null;
      }
      setUserRole(role);
      setPoll({ id: pollDoc.id, ...pollData });

      const analyticsDoc = await getDoc(doc(db, 'pollAnalytics', id));
      if (analyticsDoc.exists()) {
        setAnalytics(unflatten(analyticsDoc.data()));
      } else {
        setAnalytics(null);
      }
      setLoading(false);
    };
    if (user && id) fetch();

    const unsubscribe = onSnapshot(doc(db, 'pollAnalytics', id), (snap) => {
      if (snap.exists()) {
        setAnalytics(unflatten(snap.data()));
      }
    });
    return () => unsubscribe();
  }, [id, user, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  if (!poll || !analytics) return <div className="text-center py-20">No analytics data yet.</div>;

  const totalVotes = analytics.totalVotes || 0;
  const totalViews = analytics.totalViews || 0;
  const shares = analytics.shares || 0;
  const engagementRate = totalViews ? (totalVotes / totalViews) * 100 : 0;
  const countriesCount = Object.keys(analytics.countryCounts || {}).length;
  const lastHourVotes = Object.values(analytics.votesByHour || {}).slice(-1)[0] || 0;
  const isRatingPoll = poll.type === 'rating' && (!poll.options || poll.options.length === 0);
  const hasOptions = poll.options && poll.options.length > 0;

  const votesByDay = analytics.votesByDay || {};
  const days = Object.keys(votesByDay).sort().slice(-30);
  const timeData = days.map(day => ({ date: day.slice(5), votes: votesByDay[day] || 0 }));
  const timeDataWithTrend = computeRegressionLine(timeData, 'votes');

  const votesByHour = analytics.votesByHour || {};
  const hours = Object.keys(votesByHour).sort().slice(-24);
  const hourlyData = hours.map(hour => ({ hour: hour.slice(11,13)+':00', votes: votesByHour[hour] || 0 }));

  const genderCounts = analytics.genderCounts || { male: 0, female: 0, other: 0 };
  const genderData = [
    { name: 'Male', value: genderCounts.male || 0 },
    { name: 'Female', value: genderCounts.female || 0 },
    { name: 'Other', value: genderCounts.other || 0 },
  ];

  const ageBucketsObj = analytics.ageBuckets || {};
  const ageData = Object.entries(ageBucketsObj).map(([k, v]) => ({ age: k, count: v }));

  const countryData = analytics.countryCounts ? Object.entries(analytics.countryCounts).sort((a,b)=>b[1]-a[1]).slice(0,10) : [];

  const optionDemographics = analytics.optionDemographics || {};
  const optionResults = (poll.options || []).map(opt => {
    let votes = 0;
    if (optionDemographics[opt.id]?.totalVotes) votes = optionDemographics[opt.id].totalVotes;
    else if (opt.votes !== undefined) votes = opt.votes;
    return { id: opt.id, text: opt.text, votes };
  });
  const totalOptionVotes = optionResults.reduce((s,o) => s+o.votes, 0);
  const maxVotes = Math.max(...optionResults.map(o => o.votes), 1);

  const isCreator = poll?.creator?.id === user?.uid;
  const canViewAdvanced = isCreator || hasPremiumAnalytics(user?.tier) || canViewAdvancedAnalytics(userRole);

  let ageBucketsList = [], optionsLabels = [], heatmapData = {}, genderOptionData = [], topCountryPerOption = [];
  if (canViewAdvanced && poll.options) {
    ageBucketsList = ['18-24','25-34','35-44','45-54','55+'];
    optionsLabels = poll.options.map(o => o.text);
    heatmapData = {};
    for (const age of ageBucketsList) {
      heatmapData[age] = {};
      for (const opt of poll.options) {
        const optDemo = optionDemographics[opt.id]?.ageBuckets || {};
        const bucketVotes = optDemo[age] || 0;
        const totalAgeVotes = ageBucketsObj[age] || 1;
        heatmapData[age][opt.text] = (bucketVotes / totalAgeVotes) * 100;
      }
    }
    genderOptionData = poll.options.map(opt => ({
      option: opt.text,
      male: optionDemographics[opt.id]?.genderCounts?.male || 0,
      female: optionDemographics[opt.id]?.genderCounts?.female || 0,
      other: optionDemographics[opt.id]?.genderCounts?.other || 0,
    }));
    topCountryPerOption = poll.options.map(opt => {
      const countries = optionDemographics[opt.id]?.countryCounts || {};
      const top = Object.entries(countries).sort((a,b)=>b[1]-a[1])[0];
      return { option: opt.text, countryCode: top?.[0], percent: top?.[1] };
    });
  }

  const isPremium = hasPremiumAnalytics(user?.tier);
  const exportPNG = async () => {
    if (!containerRef.current) return;
    const canvas = await html2canvas(containerRef.current);
    canvas.toBlob(blob => saveAs(blob, `poll-${id}-analytics.png`));
  };
  const exportPDF = () => window.print();
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

  const renderHeatmap = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr><th className="p-2 border bg-gray-50">Age</th>
            {optionsLabels.map(col => <th key={col} className="p-2 border bg-gray-50">{col}</th>)}</tr>
        </thead>
        <tbody>
          {ageBucketsList.map(age => (
            <tr key={age}>
              <td className="p-2 border font-semibold">{age}</td>
              {optionsLabels.map(col => {
                const pct = heatmapData[age]?.[col] || 0;
                const intensity = Math.min(0.9, pct / 100);
                return <td key={col} className="p-2 border text-center" style={{ backgroundColor: `rgba(108,92,231,${intensity})` }}>{pct.toFixed(1)}%</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div ref={containerRef} className="max-w-7xl mx-auto space-y-6">
        <style>{`@media print { .no-print, button, .export-actions, nav, footer { display: none !important; } }`}</style>

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold">Analytics Dashboard</h1>
            <div className="export-actions flex gap-2">
              <button onClick={exportPNG} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm font-semibold">📸 PNG</button>
              <button onClick={exportPDF} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm font-semibold">🖨️ PDF</button>
              {isPremium && <button onClick={exportCSV} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm font-semibold">📊 CSV</button>}
            </div>
          </div>
          <h2 className="text-xl font-bold mt-3 break-words">{poll.question}</h2>
          <div className="flex flex-wrap gap-3 mt-2 text-sm opacity-90">
            <span>{poll.meta?.isLive ? '🔴 LIVE' : (poll.endsAt && new Date() > toDate(poll.endsAt) ? '⏰ EXPIRED' : '🟢 ACTIVE')}</span>
            <span>Created: {formatDate(poll.createdAt)}</span>
            {poll.endsAt && <span>Ends: {formatDate(poll.endsAt)}</span>}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border"><div className="text-2xl font-extrabold text-primary">{totalVotes.toLocaleString()}</div><div className="text-xs text-gray-500">Total Votes</div><div className="text-[10px] text-green-600">+{lastHourVotes} last hour</div></div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border"><div className="text-2xl font-extrabold text-primary">{totalViews.toLocaleString()}</div><div className="text-xs text-gray-500">Total Views</div><div className="text-[10px] text-green-600">Rate: {engagementRate.toFixed(1)}%</div></div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border"><div className="text-2xl font-extrabold text-primary">{shares.toLocaleString()}</div><div className="text-xs text-gray-500">Shares</div></div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border"><div className="text-2xl font-extrabold text-primary">{countriesCount}</div><div className="text-xs text-gray-500">Countries</div></div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex overflow-x-auto border-b">
            {['overview', 'options', 'demographics', 'byOption', 'insights'].map(tab => {
              if ((tab === 'demographics' || tab === 'byOption') && !canViewAdvanced) return null;
              if (tab === 'insights' && !canViewAdvanced) return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'options' ? 'Results' : tab === 'demographics' ? 'Demographics' : tab === 'byOption' ? 'By Option' : 'AI Insights'}
                </button>
              );
            })}
          </div>
          <div className="p-5">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Votes Trend (Last 30 days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={timeDataWithTrend || timeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="votes" stroke="#6C5CE7" name="Actual votes" strokeWidth={2} dot={{ r: 3 }} />
                      {timeDataWithTrend && <Line type="monotone" dataKey="trend" stroke="#FF6B6B" strokeDasharray="5 5" name="Trend line" dot={false} />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Votes by Hour (Last 24h)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="votes" fill="#6C5CE7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'options' && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 mb-2">Vote Distribution</h3>
                {isRatingPoll ? (
                  <div className="text-center py-6">
                    <p className="text-lg font-semibold text-primary">Average Rating: {poll.averageRating?.toFixed(1) || 'N/A'} / {poll.scale?.max || 5}</p>
                    <p className="text-sm text-gray-500 mt-2">Based on {totalVotes} ratings</p>
                  </div>
                ) : !hasOptions ? (
                  <p className="text-center text-gray-500 py-6">No options to display</p>
                ) : (
                  optionResults.map(opt => {
                    const pct = totalOptionVotes ? ((opt.votes / totalOptionVotes) * 100).toFixed(1) : 0;
                    const isWinner = opt.votes === maxVotes;
                    return (
                      <div key={opt.id}>
                        <div className="flex justify-between text-sm mb-1"><span>{opt.text}</span><span>{opt.votes} ({pct}%)</span></div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isWinner ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-primary/30'}`} style={{ width: `${(opt.votes / maxVotes) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'demographics' && canViewAdvanced && (
              <div className="space-y-8">
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Gender</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={genderData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6C5CE7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Age Groups</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#A855F7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Top Countries</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countryData.map(([code,count])=>({code,count}))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="code" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#FF6B6B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'byOption' && canViewAdvanced && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Option Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(poll.options || []).map(opt => {
                      const totalOpt = (optionDemographics[opt.id]?.genderCounts?.male || 0) +
                                       (optionDemographics[opt.id]?.genderCounts?.female || 0) +
                                       (optionDemographics[opt.id]?.genderCounts?.other || 0);
                      const pct = totalVotes ? ((totalOpt / totalVotes) * 100).toFixed(1) : 0;
                      const ageBuck = optionDemographics[opt.id]?.ageBuckets || {};
                      const dominantAge = Object.entries(ageBuck).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
                      const gender = optionDemographics[opt.id]?.genderCounts || {};
                      const dominantGender = Object.entries(gender).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
                      const country = Object.entries(optionDemographics[opt.id]?.countryCounts || {}).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
                      return (
                        <div key={opt.id} className="bg-gray-50 rounded-xl p-3">
                          <p className="font-bold text-gray-800">{opt.text}</p>
                          <p className="text-sm">{totalOpt} votes ({pct}%)</p>
                          <p className="text-xs text-primary mt-1">Mostly {dominantAge} {dominantGender} from {country}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Age × Option Heatmap</h4>
                  {renderHeatmap()}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Gender × Option</h4>
                  {genderOptionData.map(item => {
                    const total = item.male + item.female + item.other;
                    // Show a faint placeholder bar even if total === 0
                    const hasVotes = total > 0;
                    return (
                      <div key={item.option} className="mb-4">
                        <div className="text-sm font-medium mb-1">{item.option}</div>
                        <div className="flex h-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                          {hasVotes ? (
                            <>
                              <div className="bg-primary flex items-center justify-center text-white text-[10px]" style={{ width: `${(item.male / total) * 100}%` }}>
                                {item.male > 0 ? `${Math.round((item.male / total) * 100)}%` : ''}
                              </div>
                              <div className="bg-secondary flex items-center justify-center text-white text-[10px]" style={{ width: `${(item.female / total) * 100}%` }}>
                                {item.female > 0 ? `${Math.round((item.female / total) * 100)}%` : ''}
                              </div>
                              <div className="bg-purple-500 flex items-center justify-center text-white text-[10px]" style={{ width: `${(item.other / total) * 100}%` }}>
                                {item.other > 0 ? `${Math.round((item.other / total) * 100)}%` : ''}
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">No votes yet</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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

            {activeTab === 'insights' && canViewAdvanced && (
              <div>
                {analytics.aiInsight ? (
                  <div className="bg-purple-50 rounded-xl p-5">
                    <p className="text-gray-800">{analytics.aiInsight.text}</p>
                    <div className="mt-3 border-t border-purple-200 pt-3">
                      <span className="font-semibold">💡 Suggestion:</span> {analytics.aiInsight.suggestion}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-3">Generate AI-powered insights for this poll.</p>
                    <button onClick={handleAIInsight} disabled={generatingInsight} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold shadow">
                      {generatingInsight ? 'Generating...' : 'Generate Insight'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}