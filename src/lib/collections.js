// src/lib/collections.js – Bookmarks (no community features)
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, increment, writeBatch, limit } from 'firebase/firestore';

export async function getUserCollections(userId) {
  const q = query(collection(db, 'users', userId, 'collections'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createCollection(userId, collectionData) {
  const colRef = doc(collection(db, 'users', userId, 'collections'));
  const newCol = {
    ...collectionData,
    itemCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(colRef, newCol);
  return colRef.id;
}

export async function updateCollection(userId, collectionId, updates) {
  const ref = doc(db, 'users', userId, 'collections', collectionId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteCollection(userId, collectionId) {
  const batch = writeBatch(db);
  const itemsQuery = query(collection(db, 'users', userId, 'collections', collectionId, 'items'));
  const itemsSnap = await getDocs(itemsQuery);
  itemsSnap.forEach(itemDoc => batch.delete(itemDoc.ref));
  batch.delete(doc(db, 'users', userId, 'collections', collectionId));
  await batch.commit();
}

export async function addToCollection(userId, collectionId, itemType, itemId, itemData, notes, tags) {
  const itemRef = doc(collection(db, 'users', userId, 'collections', collectionId, 'items'));
  await setDoc(itemRef, {
    collectionId,
    itemType,
    itemId,
    itemData,
    notes: notes || '',
    tags: tags || [],
    savedAt: serverTimestamp()
  });
  const colRef = doc(db, 'users', userId, 'collections', collectionId);
  await updateDoc(colRef, { itemCount: increment(1), updatedAt: serverTimestamp() });
}

export async function removeFromCollection(userId, collectionId, itemId) {
  const q = query(collection(db, 'users', userId, 'collections', collectionId, 'items'), where('itemId', '==', itemId));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Item not found');
  await deleteDoc(snap.docs[0].ref);
  const colRef = doc(db, 'users', userId, 'collections', collectionId);
  await updateDoc(colRef, { itemCount: increment(-1), updatedAt: serverTimestamp() });
}

export async function getCollectionItems(userId, collectionId, options = {}) {
  let q = query(collection(db, 'users', userId, 'collections', collectionId, 'items'));
  if (options.itemType) q = query(q, where('itemType', '==', options.itemType));
  if (options.sortBy) q = query(q, orderBy(options.sortBy, 'desc'));
  else q = query(q, orderBy('savedAt', 'desc'));
  if (options.limit) q = query(q, limit(options.limit));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function isItemSaved(userId, itemId) {
  const collections = await getUserCollections(userId);
  const savedIn = [];
  for (const col of collections) {
    const q = query(collection(db, 'users', userId, 'collections', col.id, 'items'), where('itemId', '==', itemId));
    const snap = await getDocs(q);
    if (!snap.empty) savedIn.push(col.id);
  }
  return { isSaved: savedIn.length > 0, collectionIds: savedIn };
}

export const DEFAULT_COLLECTIONS = [
  { name: 'Learning Resources', description: 'Helpful discussions and comments to revisit', icon: 'school', color: '#6ef3ff', itemCount: 0, isPublic: false },
  { name: 'Problem Solutions', description: 'Solutions to common problems', icon: 'build', color: '#00ff88', itemCount: 0, isPublic: false },
  { name: 'Favorites', description: 'Most valuable insights', icon: 'heart', color: '#ff6b6b', itemCount: 0, isPublic: false },
  { name: 'Inspiration', description: 'Creative ideas', icon: 'bulb', color: '#9d4edd', itemCount: 0, isPublic: false }
];