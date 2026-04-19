// src/lib/viewTracker.js
import { db } from './firebase';
import { doc, runTransaction, increment, updateDoc, getDoc } from 'firebase/firestore';
import { getVoterKey } from './voterKey';
import { trackUserInteraction } from './analytics';

export async function trackPollView(pollId, userId) {
  const viewerKey = userId || await getVoterKey();
  const viewId = `${pollId}_${viewerKey}`;
  try {
    await runTransaction(db, async (transaction) => {
      const viewRef = doc(db, 'pollViews', viewId);
      const viewSnap = await transaction.get(viewRef);
      if (!viewSnap.exists()) {
        transaction.set(viewRef, {
          pollId,
          viewerId: viewerKey,
          userId: userId || null,
          firstViewedAt: new Date(),
          lastViewedAt: new Date(),
          viewCount: 1
        });
        transaction.update(doc(db, 'polls', pollId), { totalViews: increment(1), lastViewedAt: new Date() });
      } else {
        transaction.update(viewRef, { lastViewedAt: new Date(), viewCount: increment(1) });
      }
    });
    await trackUserInteraction(userId || viewerKey, 'view', { pollId, category: 'poll_view' });
    return true;
  } catch (err) {
    console.error('View tracking error:', err);
    // fallback
    try {
      await updateDoc(doc(db, 'polls', pollId), { totalViews: increment(1) });
    } catch (e) {}
    return false;
  }
}

export async function hasUserViewedPoll(pollId, userId) {
  const viewerKey = userId || await getVoterKey();
  const viewId = `${pollId}_${viewerKey}`;
  const snap = await getDoc(doc(db, 'pollViews', viewId));
  return snap.exists();
}