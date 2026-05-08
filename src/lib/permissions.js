// src/lib/permissions.js

// Owner has all permissions, admin almost all, poll_manager can create/edit polls, analyst can view analytics only.
export function canManageTeam(user, orgId) {
  const membership = user?.memberships?.[orgId];
  return membership && (membership.role === 'owner' || membership.role === 'admin');
}

export function canDeleteOrganization(user, orgId) {
  const membership = user?.memberships?.[orgId];
  return membership?.role === 'owner';
}

export function canCreatePoll(user, activeAccount, orgId) {
  if (activeAccount === 'personal') return true;
  const membership = user?.memberships?.[orgId];
  return membership && (membership.role === 'owner' || membership.role === 'admin' || membership.role === 'poll_manager');
}

export function canEditPoll(user, poll) {
  if (poll.context?.type === 'personal') {
    return poll.creator?.id === user?.uid;
  }
  if (poll.context?.type === 'organization') {
    const membership = user?.memberships?.[poll.context.orgId];
    return membership && (membership.role === 'owner' || membership.role === 'admin' || membership.role === 'poll_manager');
  }
  return false;
}

export function canViewAnalytics(user, poll) {
  if (poll.context?.type === 'personal') {
    return poll.creator?.id === user?.uid;
  }
  if (poll.context?.type === 'organization') {
    const membership = user?.memberships?.[poll.context.orgId];
    return membership && (membership.role === 'owner' || membership.role === 'admin' || membership.role === 'analyst' || membership.role === 'poll_manager');
  }
  return false;
}

export function getRole(user, orgId) {
  return user?.memberships?.[orgId]?.role || null;
}