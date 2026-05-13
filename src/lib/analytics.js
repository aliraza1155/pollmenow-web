// src/lib/analytics.js
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { canViewAnalytics } from './permissions'; // ✅ use the same permission helper

/**
 * Get full poll analytics including demographic breakdowns.
 * @param {string} pollId – Poll ID.
 * @param {string} userTier – User tier (unused now, kept for compatibility).
 * @param {string|null} userId – Optional user ID.
 * @returns {Promise<object|null>} Poll analytics data.
 */
export async function getPollAnalytics(pollId, userTier, userId = null) {
  try {
    // 1. Fetch poll document
    const pollDoc = await getDoc(doc(db, 'polls', pollId));
    if (!pollDoc.exists()) {
      console.error('Poll not found:', pollId);
      return null;
    }
    const pollData = pollDoc.data();

    // 2. Build minimal user object for permission check
    const user = userId ? { uid: userId, tier: userTier } : null;

    // 3. If user does NOT have permission to view advanced analytics, return only basic stats
    if (!canViewAnalytics(user, pollData)) {
      return {
        totalVotes: 0,
        totalViews: pollData.totalViews || 0,
        shares: 0,
        voteDistribution: {},
        participationRate: 0,
      };
    }

    // 4. Fetch the pollAnalytics document
    const analyticsDoc = await getDoc(doc(db, 'pollAnalytics', pollId));
    if (!analyticsDoc.exists()) {
      // No analytics yet (no votes)
      return {
        totalVotes: 0,
        totalViews: pollData.totalViews || 0,
        shares: 0,
        voteDistribution: {},
        participationRate: 0,
        demographics: null,
      };
    }

    const analytics = analyticsDoc.data();
    const totalVotes = analytics.totalVotes || 0;
    const totalViews = analytics.totalViews || pollData.totalViews || 0;
    const shares = analytics.shares || 0;

    // Build vote distribution from optionDemographics.totalVotes (most accurate)
    const voteDistribution = {};
    if (pollData.options) {
      for (const opt of pollData.options) {
        let votes = 0;
        if (analytics.optionDemographics && analytics.optionDemographics[opt.id]) {
          votes = analytics.optionDemographics[opt.id].totalVotes || 0;
        } else if (opt.votes !== undefined) {
          votes = opt.votes;
        }
        voteDistribution[opt.id] = votes;
      }
    }

    const basic = {
      totalVotes,
      totalViews,
      shares,
      voteDistribution,
      participationRate: totalViews ? totalVotes / totalViews : 0,
    };

    // 5. ✅ Return full analytics (demographics, trends, option-level data)
    return {
      ...basic,
      genderCounts: analytics.genderCounts || { male: 0, female: 0, other: 0 },
      ageBuckets: analytics.ageBuckets || {
        '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0,
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
      userAgent: navigator.userAgent,
    });
  } catch (err) {
    console.error('Analytics error:', err);
  }
}