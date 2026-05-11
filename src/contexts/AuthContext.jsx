// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          // Create missing user document with all required fields
          const defaultUserData = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            username: `user_${firebaseUser.uid.slice(0, 8)}`,
            type: 'individual',
            tier: 'free',
            verified: firebaseUser.emailVerified,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            followersCount: 0,
            followingCount: 0,
            pollsCreated: 0,
            pollsThisMonth: 0,
            phone: null,
            location: { country: null, city: null },
            memberships: {},
            activeAccount: 'personal',
          };
          await setDoc(userDocRef, defaultUserData);
          userDoc = await getDoc(userDocRef);
        }
        const data = userDoc.data();
        // ✅ For organization‑type users, force activeAccount to their own uid (org ID)
        const activeAccount = data.type === 'organization' ? firebaseUser.uid : (data.activeAccount || 'personal');
        setUser({
          uid: firebaseUser.uid,
          ...data,
          memberships: data.memberships || {},
          activeAccount,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const activeAccount = data.type === 'organization' ? auth.currentUser.uid : (data.activeAccount || 'personal');
        setUser({
          uid: auth.currentUser.uid,
          ...data,
          memberships: data.memberships || {},
          activeAccount,
        });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);