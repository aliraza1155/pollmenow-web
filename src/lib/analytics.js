// src/lib/analytics.js – Full analytics using pollAnalytics document
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { hasPremiumAnalytics } from './tierUtils';
import { toDate } from './utils';

/**
 * Get full poll analytics including demographic breakdowns.
 * @param {string} pollId – Poll ID.
 * @param {string} userTier – User tier (free, verified, premium, organization).
 * @param {string|null} userId – Optional user ID (for ownership check).
 * @returns {Promise<object|null>} Poll analytics data.
 */
export async function getPollAnalytics(pollId, userTier, userId = null) {
  try {
    // First check if user is creator (can see everything)
    const pollDoc = await getDoc(doc(db, 'polls', pollId));
    if (!pollDoc.exists()) {
      console.error('Poll not found:', pollId);
      return null;
    }
    const isCreator = userId && pollDoc.data().creator?.id === userId;

    // Fetch the pollAnalytics document
    const analyticsDoc = await getDoc(doc(db, 'pollAnalytics', pollId));
    if (!analyticsDoc.exists()) {
      // No analytics yet (no votes)
      return {
        totalVotes: 0,
        totalViews: pollDoc.data().totalViews || 0,
        shares: 0,
        voteDistribution: {},
        participationRate: 0,
        demographics: null,
      };
    }

    const analytics = analyticsDoc.data();
    const totalVotes = analytics.totalVotes || 0;
    const totalViews = analytics.totalViews || pollDoc.data().totalViews || 0;
    const shares = analytics.shares || 0;

    // Basic analytics (always available)
    const basic = {
      totalVotes,
      totalViews,
      shares,
      voteDistribution: analytics.optionDemographics
        ? Object.fromEntries(
            Object.entries(analytics.optionDemographics).map(([optId, demo]) => [
              optId,
              (demo.genderCounts?.male || 0) +
              (demo.genderCounts?.female || 0) +
              (demo.genderCounts?.other || 0)
            ])
          )
        : {},
      participationRate: totalViews ? totalVotes / totalViews : 0,
    };

    // For free users or non-creator without premium
    if (!hasPremiumAnalytics(userTier) && !isCreator) {
      return basic;
    }

    // Premium / creator analytics: include full demographics
    return {
      ...basic,
      genderCounts: analytics.genderCounts || { male: 0, female: 0, other: 0 },
      ageBuckets: analytics.ageBuckets || {
        "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0
      },
      countryCounts: analytics.countryCounts || {},
      regionCounts: analytics.regionCounts || {},
      votesByHour: analytics.votesByHour || {},
      votesByDay: analytics.votesByDay || {},
      optionDemographics: analytics.optionDemographics || {},
      aiInsight: analytics.aiInsight || null,
    };
  } catch (error) {
    console.error('getPollAnalytics error:', error);
    return null;
  }
}

/**
 * Track user interaction (calls Cloud Function or Firestore directly).
 * Kept simple for web.
 */
export async function trackUserInteraction(userId, action, data) {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
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