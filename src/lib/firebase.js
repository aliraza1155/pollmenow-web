// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, query, where, orderBy, limit, runTransaction, serverTimestamp, deleteDoc, writeBatch, arrayUnion, arrayRemove, deleteField, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { getAuth, updateProfile, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCW-JWt1J1iuov0zsVeiYy385nnmqUJjk0",
  authDomain: "project-b935d05e-0482-4182-816.firebaseapp.com",
  projectId: "project-b935d05e-0482-4182-816",
  storageBucket: "project-b935d05e-0482-4182-816.firebasestorage.app",
  messagingSenderId: "378267944590",
  appId: "1:378267944590:web:a0c4f0c410f4732fe8ebdf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Helper to call cloud functions
export const callFunction = async (name, data) => {
  const fn = httpsCallable(functions, name);
  const result = await fn(data);
  return result.data;
};

// Update user profile (Firestore + Auth)
export async function updateUserProfile(user, data) {
  try {
    const cleanData = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        cleanData[key] = (typeof value === 'string' && value.trim() === '') ? null : value;
      }
    });
    await Promise.all([
      updateProfile(user, {
        displayName: data.name || user.displayName || undefined,
        photoURL: data.profileImage || user.photoURL || undefined
      }),
      setDoc(doc(db, 'users', user.uid), { ...cleanData, updatedAt: serverTimestamp() }, { merge: true })
    ]);
  } catch (error) {
    console.error('Update user profile error:', error);
    throw new Error('Failed to update user profile');
  }
}

// Get user by ID
export async function getUser(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.exists() ? userDoc.data() : null;
}

// Ensure anonymous user exists
export async function ensureAnon() {
  if (!auth.currentUser) {
    const { user } = await signInAnonymously(auth);
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: 'Anonymous',
      email: '',
      username: `user_${user.uid.slice(0, 8)}`,
      type: 'individual',
      tier: 'free',
      verified: false,
      followersCount: 0,
      followingCount: 0,
      pollsCreated: 0,
      pollsThisMonth: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return user;
  }
  return auth.currentUser;
}

// Re-export commonly used Firestore functions for convenience
export const firestore = {
  serverTimestamp,
  doc, getDoc, setDoc, updateDoc, increment, deleteDoc,
  collection, addDoc, query, where, orderBy, limit,
  runTransaction, Timestamp, onSnapshot, writeBatch,
  startAfter: (doc) => doc, // simplified
  arrayUnion, arrayRemove, deleteField,
  getDocs
};