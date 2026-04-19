// src/lib/analytics.js (simplified)
import { db } from './firebase';
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit } from 'firebase/firestore';
import { hasPremiumAnalytics } from './tierUtils';
import { toDate, formatDate } from './utils';

export async function getPollAnalytics(pollId, userTier, userId = null) {
  const pollDoc = await getDoc(doc(db, 'polls', pollId));
  if (!pollDoc.exists()) return null;
  const pollData = pollDoc.data();
  const totalVotes = pollData.totalVotes || 0;
  const options = pollData.options || [];
  const voteDistribution = {};
  options.forEach(opt => { voteDistribution[opt.id] = opt.votes || 0; });
  const basic = {
    totalViews: pollData.totalViews || 0,
    totalVotes,
    voteDistribution,
    participationRate: pollData.totalViews ? totalVotes / pollData.totalViews : 0,
  };
  if (!hasPremiumAnalytics(userTier)) return basic;
  // Advanced analytics (time series simplified)
  const timeSeries = { labels: [], views: [], votes: [], shares: [] };
  // We could fetch from userInteractions but skip for brevity
  return {
    ...basic,
    timeSeries,
    engagementRate: 0,
    completionRate: basic.participationRate,
    categoryPreferences: {},
  };
}

export async function trackUserInteraction(userId, action, data) {
  // Simple tracking without extra logic
  const { db } = await import('./firebase');
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  try {
    await addDoc(collection(db, 'userInteractions'), {
      userId,
      action,
      ...data,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent
    });
  } catch (err) {
    console.error('Analytics error:', err);
  }
}