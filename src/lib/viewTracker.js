// src/lib/viewTracker.js
import { db } from './firebase';
import { doc, runTransaction, increment, updateDoc, getDoc } from 'firebase/firestore';
import { getVoterKey } from './voterKey';
import { trackUserInteraction } from './analytics';

const DEBUG = true; // Set to false to disable logs

function log(...args) {
  if (DEBUG) console.log('[ViewTracker]', ...args);
}

function error(...args) {
  if (DEBUG) console.error('[ViewTracker]', ...args);
}

/**
 * Track a poll view – increments unique view counter (per device/browser).
 * Uses voterKey (stored in localStorage) to identify the device.
 */
export async function trackPollView(pollId, userId) {
  const viewerKey = await getVoterKey();
  const viewId = `${pollId}_${viewerKey}`;
  log(`Tracking view for poll ${pollId}, viewerKey: ${viewerKey.substring(0, 8)}..., viewId: ${viewId}`);

  try {
    // Use transaction to ensure atomic check-and-set
    await runTransaction(db, async (transaction) => {
      const viewRef = doc(db, 'pollViews', viewId);
      const viewSnap = await transaction.get(viewRef);
      if (!viewSnap.exists()) {
        log('First view from this device – creating pollViews document and incrementing totalViews');
        transaction.set(viewRef, {
          pollId,
          viewerId: viewerKey,
          userId: userId || null,
          firstViewedAt: new Date(),
          lastViewedAt: new Date(),
          viewCount: 1
        });
        transaction.update(doc(db, 'polls', pollId), {
          totalViews: increment(1),
          lastViewedAt: new Date()
        });
      } else {
        const data = viewSnap.data();
        log(`Repeat view from this device – viewCount previously ${data.viewCount}, not incrementing totalViews`);
        transaction.update(viewRef, {
          lastViewedAt: new Date(),
          viewCount: increment(1)
        });
        // Do NOT increment totalViews again
      }
    });
    log('View tracking transaction completed successfully');
    // Track interaction for analytics (non-critical)
    await trackUserInteraction(userId || viewerKey, 'view', { pollId, category: 'poll_view' });
    return true;
  } catch (err) {
    error('View tracking transaction failed:', err.code, err.message);
    // Fallback: try to increment totalViews directly (to at least count the view)
    try {
      log('Fallback: directly incrementing totalViews');
      await updateDoc(doc(db, 'polls', pollId), { totalViews: increment(1), lastViewedAt: new Date() });
    } catch (fallbackErr) {
      error('Fallback also failed:', fallbackErr);
    }
    return false;
  }
}

/**
 * Check if a user (or device) has already viewed the poll.
 */
export async function hasUserViewedPoll(pollId, userId) {
  const viewerKey = await getVoterKey();
  const viewId = `${pollId}_${userId || viewerKey}`;
  try {
    const snap = await getDoc(doc(db, 'pollViews', viewId));
    const exists = snap.exists();
    log(`hasUserViewedPoll(${pollId}) -> ${exists}`);
    return exists;
  } catch (err) {
    error('hasUserViewedPoll error:', err);
    return false;
  }
}