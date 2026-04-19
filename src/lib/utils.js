// src/lib/utils.js
import { Timestamp } from 'firebase/firestore';

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && 'seconds' in value) {
    return new Timestamp(value.seconds, value.nanoseconds).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
}

export function formatDate(date, type = 'full') {
  const d = toDate(date);
  if (!d) return 'Unknown date';
  if (type === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatRelativeTime(date) {
  const d = toDate(date);
  if (!d) return '';
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function getTimeLeftInHours(endsAt) {
  const end = toDate(endsAt);
  if (!end) return null;
  const left = Math.max(0, end - Date.now());
  return Math.ceil(left / (1000 * 60 * 60));
}

export function convertOptionsToArray(options) {
  if (Array.isArray(options)) return options;
  if (options && typeof options === 'object') {
    return Object.entries(options).map(([id, opt]) => ({
      id,
      text: opt.text || 'Unnamed',
      votes: opt.votes || 0,
      mediaUrl: opt.mediaUrl,
      mediaType: opt.mediaType
    }));
  }
  return [];
}

export async function generateAccessCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  // simple hash using web crypto
  const encoder = new TextEncoder();
  const data = encoder.encode(random + Date.now());
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 6).toUpperCase();
}

export function calculateCategoryPreferences(interactions) {
  const prefs = {};
  interactions.forEach(({ category, action }) => {
    const weight = action === 'vote' ? 2 : action === 'share' ? 3 : 1;
    prefs[category] = (prefs[category] || 0) + weight;
  });
  return prefs;
}

// No user votes count helper needed for web