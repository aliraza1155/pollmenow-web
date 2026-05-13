import { db } from './firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';

/**
 * Record a share for a poll.
 * Increments shares counter in pollAnalytics and totalShares in the poll document.
 * @param {string} pollId - The poll ID.
 * @param {string|null} userId - Optional user ID (for analytics, not required for increment).
 */
export async function recordShare(pollId, userId = null) {
  try {
    await runTransaction(db, async (transaction) => {
      const analyticsRef = doc(db, 'pollAnalytics', pollId);
      const pollRef = doc(db, 'polls', pollId);

      const analyticsSnap = await transaction.get(analyticsRef);
      if (analyticsSnap.exists()) {
        transaction.update(analyticsRef, { shares: increment(1) });
      } else {
        // Create analytics document with initial share count 1
        transaction.set(analyticsRef, { shares: 1 });
      }

      // Also increment totalShares on the poll document (optional but useful)
      transaction.update(pollRef, { totalShares: increment(1) });
    });
    console.log(`[ShareTracker] Share recorded for poll ${pollId}`);
  } catch (err) {
    console.error('[ShareTracker] Failed to record share:', err);
  }
}