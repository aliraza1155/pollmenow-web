// src/lib/pollTypeUtils.js
import { POLL_TYPES } from './constants';

export function getPollTypeConfig(type) {
  return POLL_TYPES.find(t => t.value === type) || POLL_TYPES[0];
}

export function getPollTypeDescription(type) {
  const config = getPollTypeConfig(type);
  return config.description || 'Custom poll type';
}

export function canEditOptions(type) {
  return type !== 'yesno' && type !== 'rating';
}

export function shouldShowOptions(type) {
  return type !== 'rating';
}