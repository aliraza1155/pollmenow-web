// src/lib/types.js
export const UserTier = {
  FREE: 'free',
  VERIFIED: 'verified',
  PREMIUM: 'premium',
  ORGANIZATION: 'organization'
};

export const UserType = {
  INDIVIDUAL: 'individual',
  ORGANIZATION: 'organization'
};

export const PollType = {
  QUICK: 'quick',
  YESNO: 'yesno',
  RATING: 'rating',
  COMPARISON: 'comparison',
  TARGETED: 'targeted',
  LIVE: 'live'
};

export const PollVisibility = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private'
};

export const TeamRole = {
  ADMIN: 'admin',
  POLL_MANAGER: 'poll_manager',
  ANALYST: 'analyst',
  MEMBER: 'member'
};

// Basic types used across the app
export {};

// For convenience, also export as values (optional)