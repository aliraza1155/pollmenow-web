// src/lib/vote.js
import { db } from './firebase';
import { doc, getDoc, runTransaction, increment, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { getVoterKey } from './voterKey';
import { requiresLoginToVote } from './tierUtils';
import { sendVoteNotification } from './notifications';
import { trackUserInteraction } from './analytics';
import { getCountryFromIP } from './location';

export async function submitVote(pollId, optionId, userId, anonymous = false, accessCode = null, creatorTier = 'free') {
  if (requiresLoginToVote(creatorTier) && !userId) {
    throw new Error('Login required to vote in this poll');
  }
  const voterKey = await getVoterKey();
  const voteId = anonymous ? `${pollId}_${voterKey}` : `${pollId}_${userId}`;
  const location = await getCountryFromIP();
  const country = location?.country || null;

  return runTransaction(db, async (transaction) => {
    const existingVote = await transaction.get(doc(db, 'votes', voteId));
    if (existingVote.exists()) throw new Error('You have already voted');

    const pollRef = doc(db, 'polls', pollId);
    const pollSnap = await transaction.get(pollRef);
    if (!pollSnap.exists()) throw new Error('Poll not found');
    const pollData = pollSnap.data();

    // Validate option
    if (pollData.type === 'rating') {
      const rating = parseInt(optionId);
      const scale = pollData.scale || { min: 1, max: 5 };
      if (isNaN(rating) || rating < scale.min || rating > scale.max) throw new Error('Invalid rating');
    } else {
      const options = pollData.options || [];
      const optionExists = options.some(opt => opt.id === optionId);
      if (!optionExists) throw new Error('Invalid option');
    }

    // Domain restriction
    if (pollData.allowedDomains?.length) {
      if (!userId) throw new Error('Login required');
      const userDoc = await transaction.get(doc(db, 'users', userId));
      const userEmail = userDoc.data()?.email;
      if (!userEmail) throw new Error('Email required');
      const domain = '@' + userEmail.split('@')[1];
      if (!pollData.allowedDomains.includes(domain)) {
        throw new Error(`Only domains ${pollData.allowedDomains.join(', ')} allowed`);
      }
    }

    // Create vote document
    const voteData = {
      pollId,
      optionId,
      createdAt: serverTimestamp(),
      metadata: {
        ip: 'client-side',
        userAgent: navigator.userAgent,
        location: country,
        category: pollData.category
      }
    };
    if (userId && !anonymous) voteData.userId = userId;
    if (anonymous) voteData.deviceId = voterKey;
    if (accessCode) voteData.accessCode = accessCode;

    transaction.set(doc(db, 'votes', voteId), voteData);

    // Update poll
    if (pollData.type === 'rating') {
      const rating = parseInt(optionId);
      const ratingCounts = pollData.ratingCounts || {};
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
      const totalRatings = Object.values(ratingCounts).reduce((a,b) => a+b, 0);
      const sumRatings = Object.entries(ratingCounts).reduce((sum, [r,c]) => sum + parseInt(r) * c, 0);
      const avg = totalRatings > 0 ? sumRatings / totalRatings : 0;
      transaction.update(pollRef, {
        ratingCounts,
        averageRating: avg,
        totalVotes: increment(1)
      });
    } else {
      const options = pollData.options.map(opt =>
        opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
      );
      transaction.update(pollRef, { options, totalVotes: increment(1) });
    }
    return true;
  });
}

export async function hasUserVoted(pollId, userId, checkAnonymous = true) {
  if (userId) {
    const snap = await getDoc(doc(db, 'votes', `${pollId}_${userId}`));
    if (snap.exists()) return true;
  }
  if (checkAnonymous) {
    const voterKey = await getVoterKey();
    const snap = await getDoc(doc(db, 'votes', `${pollId}_${voterKey}`));
    if (snap.exists()) return true;
  }
  return false;
}

export async function getUserVotes(userId) {
  try {
    const votesQuery = query(collection(db, 'votes'), where('userId', '==', userId));
    const votesSnapshot = await getDocs(votesQuery);
    const userVotes = votesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isAnonymous: false }));

    const voterKey = await getVoterKey();
    const anonVotesQuery = query(collection(db, 'votes'), where('deviceId', '==', voterKey));
    const anonVotesSnapshot = await getDocs(anonVotesQuery);
    const anonymousVotes = anonVotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isAnonymous: true }));

    return [...userVotes, ...anonymousVotes];
  } catch (error) {
    console.error('Error getting user votes:', error);
    return [];
  }
}