// src/lib/notifications.js
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { NOTIFICATION_TEMPLATES } from './constants';

export async function sendNotification(notification) {
  try {
    const userDoc = await getDoc(doc(db, 'users', notification.userId));
    if (!userDoc.exists()) return;
    const userSettings = userDoc.data().notificationSettings || {};
    if (userSettings[notification.type] === false) return;

    await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    });

    // Browser push notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, { body: notification.message });
    }
  } catch (err) {
    console.warn('Send notification error:', err);
  }
}

export async function sendTemplateNotification(userId, type, replacements, relatedId, data, priority = 'normal') {
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) return;
  let title = template.title;
  let message = template.message;
  for (const [key, val] of Object.entries(replacements)) {
    title = title.replace(`{${key}}`, val);
    message = message.replace(`{${key}}`, val);
  }
  await sendNotification({ userId, type, title, message, relatedId, data, priority });
}

export async function sendVoteNotification(pollId, voterId, pollCreatorId, pollTitle) {
  if (voterId === pollCreatorId) return;
  const voterDoc = await getDoc(doc(db, 'users', voterId));
  const voterName = voterDoc.exists() ? voterDoc.data().name || 'Someone' : 'Someone';
  await sendTemplateNotification(
    pollCreatorId,
    'vote_received',
    { pollTitle: pollTitle || 'Your poll', username: voterName },
    pollId,
    { voterId },
    'normal'
  );
}

export async function markAsRead(notificationId) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllAsRead(userId) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach(doc => batch.update(doc.ref, { read: true }));
  await batch.commit();
}

export async function getUnreadNotificationCount(userId) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  return snap.size;
}