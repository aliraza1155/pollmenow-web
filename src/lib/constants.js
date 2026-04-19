// src/lib/constants.js
export const CATEGORIES = [
  { id: 'general', name: 'General' },
  { id: 'sports', name: 'Sports' },
  { id: 'politics', name: 'Politics' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'technology', name: 'Technology' },
  { id: 'education', name: 'Education' },
  { id: 'health', name: 'Health' },
  { id: 'business', name: 'Business' },
  { id: 'lifestyle', name: 'Lifestyle' },
  { id: 'science', name: 'Science' },
  { id: 'other', name: 'Other' }
];

// Targeted poll type removed – targeting is now a premium feature for any poll type
export const POLL_TYPES = [
  { label: 'Quick Poll', value: 'quick', minOptions: 2, maxOptions: 6, structure: 'standard', requiresMedia: false, description: 'Standard poll with multiple options', premium: false },
  { label: 'Yes/No', value: 'yesno', minOptions: 2, maxOptions: 2, structure: 'binary', requiresMedia: false, description: 'Simple yes/no binary question', premium: false },
  { label: 'Rating', value: 'rating', minOptions: 0, maxOptions: 0, structure: 'scale', requiresMedia: false, description: 'Rating scale from min to max', premium: false },
  { label: 'Comparison', value: 'comparison', premium: true, minOptions: 2, maxOptions: 4, structure: 'comparative', requiresMedia: true, description: 'Compare options with media', premium: true },
  { label: 'Live Event', value: 'live', premium: true, minOptions: 2, maxOptions: 6, structure: 'timed', requiresMedia: false, description: 'Live poll with urgency timer', premium: true }
];

export const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Friends Only', value: 'friends', premium: true },
  { label: 'Private', value: 'private', premium: true }
];

export const DURATION_OPTIONS = [
  { label: 'No expiry', value: null },
  { label: '1 Hour', value: 3600 * 1000 },
  { label: '1 Day', value: 86400 * 1000 },
  { label: '1 Week', value: 604800 * 1000 },
  { label: '1 Month', value: 2592000 * 1000 }
];

export const MAX_TITLE_LENGTH = 120;
export const MAX_OPTION_LENGTH = 80;
export const MAX_TAGS = 5;

export const NOTIFICATION_TEMPLATES = {
  poll_created: { title: 'New Poll Created', message: 'Your poll "{pollTitle}" has been created!' },
  poll_ended: { title: 'Poll Ended', message: 'Your poll "{pollTitle}" has ended.' },
  vote_received: { title: 'New Vote', message: 'Someone voted on your poll "{pollTitle}".' },
  poll_viewed: { title: 'Poll Viewed', message: 'Your poll "{pollTitle}" was viewed by {username}.' },
  poll_shared: { title: 'Poll Shared', message: 'Your poll "{pollTitle}" was shared by {username}.' },
  team_invite: { title: 'Team Invite', message: 'You\'ve been invited to join {teamName}.' },
  verification_approved: { title: 'Account Verified', message: 'Your account has been verified!' },
  premium_activated: { title: 'Premium Activated', message: 'You\'ve activated Premium! Enjoy premium features.' },
  friend_poll_created: { title: 'Friend\'s Poll', message: '{username} created a new poll: "{pollTitle}".' },
  private_poll_access: { title: 'Private Poll Access', message: 'You\'ve been granted access to a private poll: "{pollTitle}".' },
  follower_added: { title: 'New Follower', message: '{username} started following you.' }
};

export const BADGES = [ /* keep as is */ ];
export const SUBSCRIPTION_PLANS = [ /* keep as is */ ];
export const STRIPE_CONFIG = { /* keep as is */ };