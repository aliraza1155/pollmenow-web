// src/hooks/usePoll.js
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { convertOptionsToArray, toDate } from '../lib/utils';

export function usePoll(pollId) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pollId) return;
    const unsubscribe = onSnapshot(
      doc(db, 'polls', pollId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Ensure creator object has a default tier
          const creator = data.creator || {};
          const safeCreator = {
            id: creator.id || '',
            name: creator.name || 'Anonymous',
            username: creator.username,
            type: creator.type || 'individual',
            verified: creator.verified || false,
            profileImage: creator.profileImage,
            tier: creator.tier || 'free',   // ← default tier
          };
          setPoll({
            id: docSnap.id,
            ...data,
            creator: safeCreator,
            options: convertOptionsToArray(data.options),
            createdAt: toDate(data.createdAt),
            endsAt: toDate(data.endsAt),
          });
        } else {
          setError('Poll not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Poll snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [pollId]);

  return { poll, loading, error };
}