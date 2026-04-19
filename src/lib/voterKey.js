// src/lib/voterKey.js
const VOTER_KEY = 'pollpoint:voterKey';

export async function getVoterKey() {
  let key = localStorage.getItem(VOTER_KEY);
  if (!key) {
    const random = Math.random().toString(36).slice(2) + Date.now();
    key = await sha256(random);
    localStorage.setItem(VOTER_KEY, key);
  }
  return key;
}

export async function clearVoterKey() {
  localStorage.removeItem(VOTER_KEY);
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}