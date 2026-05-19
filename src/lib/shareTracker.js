// src/lib/shareTracker.js
import { db } from './firebase';
import { doc, runTransaction, increment, setDoc } from 'firebase/firestore';

/**
 * Record a share for a poll.
 * Increments shares counter in pollAnalytics and totalShares in the poll document.
 * @param {string} pollId - The poll ID.
 * @param {string|null} userId - Optional user ID (not used for increment, but kept for logging).
 * @returns {Promise<boolean>} true if successful, false otherwise
 */
export async function recordShare(pollId, userId = null) {
  if (!pollId) {
    console.error('[shareTracker] No pollId provided');
    return false;
  }

  console.log(`[shareTracker] Attempting to record share for poll ${pollId}${userId ? ` (user: ${userId})` : ''}`);

  const analyticsRef = doc(db, 'pollAnalytics', pollId);
  const pollRef = doc(db, 'polls', pollId);

  try {
    // Try transaction first (atomic update of both documents)
    await runTransaction(db, async (transaction) => {
      const analyticsSnap = await transaction.get(analyticsRef);
      if (analyticsSnap.exists()) {
        transaction.update(analyticsRef, { shares: increment(1) });
        console.log('[shareTracker] Transaction: updating existing analytics document');
      } else {
        transaction.set(analyticsRef, { shares: 1 });
        console.log('[shareTracker] Transaction: creating analytics document with shares=1');
      }
      transaction.update(pollRef, { totalShares: increment(1) });
      console.log('[shareTracker] Transaction: incrementing totalShares on poll document');
    });
    console.log(`[shareTracker] ✅ Share recorded successfully (transaction) for poll ${pollId}`);
    return true;
  } catch (err) {
    console.warn('[shareTracker] Transaction failed, trying fallback (setDoc with merge):', err.message);
    // Fallback: try setDoc with merge (works even if document doesn't exist)
    try {
      await setDoc(analyticsRef, { shares: increment(1) }, { merge: true });
      await setDoc(pollRef, { totalShares: increment(1) }, { merge: true });
      console.log(`[shareTracker] ✅ Share recorded successfully (fallback) for poll ${pollId}`);
      return true;
    } catch (fallbackErr) {
      console.error('[shareTracker] ❌ All share recording methods failed:', fallbackErr);
      return false;
    }
  }
}