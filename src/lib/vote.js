// src/lib/vote.js
import { db } from './firebase';
import { doc, getDoc, runTransaction, increment, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { getVoterKey } from './voterKey';
import { sendVoteNotification } from './notifications';
import { getCountryFromIP } from './location';

export async function submitVote(pollId, optionId, userId, anonymous = false, accessCode = null) {
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

    // Rule: if poll.anonymous === false, login required
    if (!pollData.anonymous && !userId) {
      throw new Error('Login required to vote in this poll');
    }

    // ========== TARGETING ENFORCEMENT ==========
    if (pollData.meta?.targetDemographics) {
      const target = pollData.meta.targetDemographics;
      // Targeting requires a logged‑in user (because we need age/gender/location from profile)
      if (!userId) {
        throw new Error('This poll is targeted to a specific audience. Please log in to vote.');
      }
      const userDoc = await transaction.get(doc(db, 'users', userId));
      if (!userDoc.exists()) throw new Error('User data not found');
      const userData = userDoc.data();

      // Age check
      if (target.ageRange && userData.age) {
        const age = parseInt(userData.age);
        if (age < target.ageRange[0] || age > target.ageRange[1]) {
          throw new Error(`This poll is only for users aged ${target.ageRange[0]}–${target.ageRange[1]}.`);
        }
      } else if (target.ageRange) {
        // User has no age in profile
        throw new Error(`This poll requires you to set your age in profile (${target.ageRange[0]}–${target.ageRange[1]}).`);
      }

      // Gender check
      if (target.genders && target.genders.length > 0) {
        if (!userData.gender) {
          throw new Error('This poll requires you to specify your gender in your profile.');
        }
        if (!target.genders.includes(userData.gender)) {
          throw new Error('Your gender does not match the target audience for this poll.');
        }
      }

      // Country check (from profile, not IP)
      if (target.locations && target.locations.length > 0) {
        const userCountry = userData.location?.country;
        if (!userCountry) {
          throw new Error('This poll requires you to set your country in your profile.');
        }
        if (!target.locations.includes(userCountry)) {
          throw new Error(`This poll is only available in specific countries (${target.locations.join(', ')}).`);
        }
      }
    }

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

    // Prepare vote data
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

    if (anonymous) {
      voteData.deviceId = voterKey;
      if (userId) {
        // Logged‑in user voting anonymously – capture demographics without identity
        const userDoc = await transaction.get(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          voteData.demographics = {
            age: userData.age || null,
            gender: userData.gender || null,
            country: userData.location?.country || null,
          };
        }
      }
    } else {
      // Non‑anonymous vote: store user identity (for creator to see)
      voteData.userId = userId;
      const userDoc = await transaction.get(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        voteData.user = {
          id: userId,
          name: userData.name || 'Anonymous',
          profileImage: userData.profileImage || null,
          username: userData.username,
          age: userData.age || null,
          gender: userData.gender || null,
          location: userData.location || null,
        };
      }
    }

    if (accessCode) voteData.accessCode = accessCode;

    transaction.set(doc(db, 'votes', voteId), voteData);

    // Update poll (rating or standard)
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

    // Send notification only for non‑anonymous votes
    if (userId && !anonymous && pollData.creator?.id !== userId) {
      sendVoteNotification(pollId, userId, pollData.creator?.id, pollData.question).catch(console.error);
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

/**
 * Get all non‑anonymous votes for a poll (creator view).
 */
export async function getPollVotes(pollId) {
  const votesQuery = query(
    collection(db, 'votes'),
    where('pollId', '==', pollId),
    where('userId', '!=', null)
  );
  const snapshot = await getDocs(votesQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get all votes for analytics aggregation (including demographic data from anonymous votes).
 * This is used by the analytics engine (e.g., cloud function) to compute age/gender/country breakdowns.
 * Does not expose user identities.
 */
export async function getAnalyticsVotes(pollId) {
  const votesQuery = query(
    collection(db, 'votes'),
    where('pollId', '==', pollId)
  );
  const snapshot = await getDocs(votesQuery);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    // Return only safe fields for aggregation
    return {
      optionId: data.optionId,
      demographics: data.demographics || null,
      userId: data.userId || null, // only present for non‑anonymous
      metadata: data.metadata || null,
    };
  });
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