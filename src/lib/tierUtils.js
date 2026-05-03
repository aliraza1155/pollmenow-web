// src/lib/tierUtils.js
import { UserTier, PollType, PollVisibility } from './types';

export const TIER_LIMITS = {
  free: {
    maxPollsPerMonth: 5,
    maxOptionsPerPoll: 4,
    allowedPollTypes: ['quick', 'rating', 'yesno'],
    allowedVisibility: ['public'],
    requiresLoginToVote: true,
    analyticsLevel: 'basic',
    branding: 'standard',
    teamManagement: false,
    targeting: false,
    prizeEligibility: false,
    prioritySupport: false,
    aiFeatures: false,
    aiPollGeneration: false,
    aiRephrasing: false,
    features: ['Basic polling features', '4 options per poll', '5 polls per month', 'Public polls only', 'Login required to vote']
  },
  verified: {
    maxPollsPerMonth: 10,
    maxOptionsPerPoll: 4,
    allowedPollTypes: ['quick', 'rating', 'yesno'],
    allowedVisibility: ['public'],
    requiresLoginToVote: true,
    analyticsLevel: 'basic',
    branding: 'standard',
    teamManagement: false,
    targeting: false,
    prizeEligibility: false,
    prioritySupport: false,
    aiFeatures: false,
    aiPollGeneration: false,
    aiRephrasing: false,
    features: ['All Free features', '10 polls per month', 'Verified badge', 'Higher search placement']
  },
  premium: {
    maxPollsPerMonth: 15,
    maxOptionsPerPoll: 10,
    allowedPollTypes: ['quick', 'rating', 'yesno', 'comparison', 'live'],
    allowedVisibility: ['public', 'friends', 'private'],
    requiresLoginToVote: false,
    analyticsLevel: 'premium',
    branding: 'premium',
    teamManagement: false,
    targeting: true,
    prizeEligibility: true,
    prioritySupport: true,
    aiFeatures: true,
    aiPollGeneration: true,
    aiRephrasing: true,
    features: ['All Verified features', '15 polls per month', 'Advanced poll types', 'No login required for voters', 'Advanced analytics', 'Priority support', 'Custom branding', 'AI-powered poll creation', 'AI rephrasing assistance']
  },
  organization: {
    maxPollsPerMonth: Infinity,
    maxOptionsPerPoll: 10,
    allowedPollTypes: ['quick', 'rating', 'yesno', 'comparison', 'live'],
    allowedVisibility: ['public', 'friends', 'private'],
    requiresLoginToVote: false,
    analyticsLevel: 'premium',
    branding: 'custom',
    teamManagement: true,
    targeting: true,
    prizeEligibility: true,
    prioritySupport: true,
    aiFeatures: true,
    aiPollGeneration: true,
    aiRephrasing: true,
    features: ['All Premium features', 'Team management', 'Advanced targeting', 'Organization branding', 'Priority placement', 'Custom domain', 'AI-powered poll creation', 'AI rephrasing assistance']
  }
};

// Safe helper to get limits for a tier (fallback to free)
function getLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

// All helper functions now use getLimits()
export function canCreatePollType(tier, pollType) { 
  return getLimits(tier).allowedPollTypes.includes(pollType); 
}
export function canUseVisibility(tier, visibility) { 
  return getLimits(tier).allowedVisibility.includes(visibility); 
}
export function getMaxOptions(tier) { 
  return getLimits(tier).maxOptionsPerPoll; 
}
export function getMonthlyPollLimit(tier) { 
  return getLimits(tier).maxPollsPerMonth; 
}
export function requiresLoginToVote(tier) { 
  return getLimits(tier).requiresLoginToVote; 
}
export function hasPremiumAnalytics(tier) { 
  return getLimits(tier).analyticsLevel === 'premium'; 
}
export function hasTeamManagement(tier) { 
  return getLimits(tier).teamManagement; 
}
export function hasTargeting(tier) { 
  return getLimits(tier).targeting; 
}
export function canUseAIFeatures(tier) { 
  return getLimits(tier).aiFeatures; 
}
export function canUseAIPollGeneration(tier) { 
  return getLimits(tier).aiPollGeneration; 
}
export function canUseAIRephrasing(tier) { 
  return getLimits(tier).aiRephrasing; 
}