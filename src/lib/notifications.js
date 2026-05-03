// src/lib/notifications.js – complete web notification service
import { db } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { NOTIFICATION_TEMPLATES } from './constants';

// =============================================================================
// Web Notifications Helper (Browser)
// =============================================================================

/**
 * Request permission for browser push notifications.
 * Should be called after user interaction (e.g., a button click).
 * @returns {Promise<boolean>} true if granted, false otherwise.
 */
export async function requestWebNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Show a browser notification (used by sendNotification if permission granted).
 * @param {string} title
 * @param {string} body
 * @param {object} options - e.g., { icon, tag, url, data }
 */
export function showBrowserNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notification = new Notification(title, {
    body,
    icon: options.icon || '/logo192.png',
    tag: options.tag || 'default',
    data: options.data || {},
  });
  // Handle click: navigate to provided URL
  if (options.url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.url;
    };
  }
}

// =============================================================================
// Core Notification Functions
// =============================================================================

/**
 * Send a single notification. Respects user settings (Firestore) and browser permissions.
 * @param {Object} notification - { userId, type, title, message, relatedId?, data?, priority? }
 */
export async function sendNotification(notification) {
  try {
    // Fetch user settings
    const userDoc = await getDoc(doc(db, 'users', notification.userId));
    if (!userDoc.exists()) return;
    const userData = userDoc.data();
    const userSettings = userData.notificationSettings || {};

    // Check if user disabled this notification type
    if (userSettings[notification.type] === false) return;

    // Clean undefined fields (Firestore does not accept undefined)
    const cleanNotification = Object.fromEntries(
      Object.entries(notification).filter(([_, v]) => v !== undefined)
    );

    // Save to Firestore
    await addDoc(collection(db, 'notifications'), {
      ...cleanNotification,
      read: false,
      createdAt: serverTimestamp()
    });

    // Browser push notification if:
    // - permission granted
    // - user has not disabled 'popup' setting (default true)
    // - we are in a browser environment
    if (typeof window !== 'undefined' && Notification.permission === 'granted' && userSettings.popup !== false) {
      // Build click‑through URL if relatedId exists
      let targetUrl = null;
      if (notification.relatedId) {
        if (notification.type.includes('poll')) {
          targetUrl = `${window.location.origin}/poll/${notification.relatedId}`;
        } else if (notification.type === 'follower_added') {
          targetUrl = `${window.location.origin}/profile/${notification.data?.followerId || notification.relatedId}`;
        } else {
          targetUrl = `${window.location.origin}/notifications`;
        }
      }
      showBrowserNotification(notification.title, notification.message, {
        tag: notification.type,
        url: targetUrl,
      });
    }
  } catch (err) {
    console.warn('Send notification error:', err.message);
  }
}

/**
 * Send batch notifications (limited to a few at a time).
 * @param {Array} notifications - array of notification objects (without id/timestamp/read)
 */
export async function sendBatchNotifications(notifications) {
  try {
    const batch = writeBatch(db);
    for (const note of notifications) {
      // Skip if user disabled this type (we could also skip early, but we'd need userDoc per user)
      const userDoc = await getDoc(doc(db, 'users', note.userId));
      if (!userDoc.exists()) continue;
      const userSettings = userDoc.data().notificationSettings || {};
      if (userSettings[note.type] === false) continue;

      const cleanNote = Object.fromEntries(Object.entries(note).filter(([_, v]) => v !== undefined));
      const ref = doc(collection(db, 'notifications'));
      batch.set(ref, {
        ...cleanNote,
        read: false,
        createdAt: serverTimestamp()
      });
    }
    await batch.commit();
  } catch (err) {
    console.warn('Send batch notifications error:', err.message);
  }
}

/**
 * Send a notification using a template from constants.
 */
export async function sendTemplateNotification(
  userId,
  type,
  replacements = {},
  relatedId,
  data,
  priority = 'normal'
) {
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) {
    console.warn(`Notification template not found for type: ${type}`);
    return;
  }
  let title = template.title;
  let message = template.message;
  for (const [key, val] of Object.entries(replacements)) {
    title = title.replace(`{${key}}`, val);
    message = message.replace(`{${key}}`, val);
  }
  await sendNotification({
    userId,
    type,
    title,
    message,
    relatedId,
    data,
    priority
  });
}

/**
 * Specialised vote notification (prevents self‑notification)
 */
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

// =============================================================================
// Read / Unread Management
// =============================================================================

export async function markAsRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (err) {
    console.warn('Mark as read error:', err.message);
  }
}

export async function markAllAsRead(userId) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Mark all as read error:', err.message);
  }
}

export async function getUnreadNotificationCount(userId) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.warn('Get unread count error:', err.message);
    return 0;
  }
}

// =============================================================================
// User Notification Settings
// =============================================================================

/**
 * Update user notification settings (stored in user document).
 * @param {string} userId
 * @param {object} settings - partial settings object
 */
export async function updateUserNotificationSettings(userId, settings) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationSettings: settings,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Update notification settings error:', err.message);
    throw new Error('Failed to save notification settings');
  }
}

/**
 * Get user notification settings with defaults.
 * @param {string} userId
 * @returns {Promise<object>} settings object
 */
export async function getUserNotificationSettings(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return getDefaultSettings();
    }
    const userData = userDoc.data();
    const settings = userData.notificationSettings || {};
    // Merge with defaults to ensure all keys exist
    return { ...getDefaultSettings(), ...settings };
  } catch (err) {
    console.warn('Get notification settings error:', err.message);
    return getDefaultSettings();
  }
}

function getDefaultSettings() {
  return {
    important: true,
    votes: true,
    followers: true,
    achievements: true,
    discussions: true,
    sound: true,
    popup: true,
    // vibration not supported on web, but kept for compatibility
    vibration: true,
  };
}