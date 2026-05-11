// src/lib/permissions.js

// Helper to get role for an organization
export function getRole(user, orgId) {
  if (!orgId || !user?.memberships) return null;
  return user.memberships[orgId]?.role || null;
}

// Team management (admins and owners)
export function canManageTeam(user, orgId) {
  const role = getRole(user, orgId);
  return role === 'owner' || role === 'admin';
}

// Delete organization (owner only)
export function canDeleteOrganization(user, orgId) {
  const role = getRole(user, orgId);
  return role === 'owner';
}

// Can edit organization profile (owner or admin)
export function canEditOrgProfile(user, orgId) {
  const role = getRole(user, orgId);
  return role === 'owner' || role === 'admin';
}

// Can manage billing for organization (owner only)
export function canManageOrgBilling(user, orgId) {
  const role = getRole(user, orgId);
  return role === 'owner';
}

// Create poll in organization context
export function canCreatePoll(user, activeAccount, orgId) {
  if (activeAccount === 'personal') return true;
  const role = getRole(user, orgId);
  return role === 'owner' || role === 'admin' || role === 'poll_manager';
}

// Edit/delete a specific poll (based on poll ownership and role)
export function canEditPoll(user, poll) {
  if (poll.context?.type === 'personal') {
    return poll.creator?.id === user?.uid;
  }
  if (poll.context?.type === 'organization') {
    const role = getRole(user, poll.context.orgId);
    if (role === 'owner' || role === 'admin') return true;
    if (role === 'poll_manager') {
      return poll.creator?.id === user?.uid;
    }
    return false;
  }
  return false;
}
export const canDeletePoll = canEditPoll;

// View analytics for a poll
export function canViewAnalytics(user, poll) {
  if (poll.context?.type === 'personal') {
    return poll.creator?.id === user?.uid;
  }
  if (poll.context?.type === 'organization') {
    const role = getRole(user, poll.context.orgId);
    return role === 'owner' || role === 'admin' || role === 'poll_manager' || role === 'analyst';
  }
  return false;
}

// Can view the organization analytics dashboard (aggregated)
export function canViewOrgAnalytics(user, orgId) {
  const role = getRole(user, orgId);
  return role === 'owner' || role === 'admin' || role === 'poll_manager' || role === 'analyst';
}



// src/lib/permissions.js – add these after the existing functions

// ========== ROLE-BASED PERMISSIONS FOR ORGANIZATION ACTIONS ==========

export function canCreatePollInOrg(role) {
  return ['owner', 'admin', 'poll_manager'].includes(role);
}

export function canSchedulePollInOrg(role) {
  return ['owner', 'admin', 'poll_manager'].includes(role);
}

export function canEditAnyPollInOrg(role) {
  return ['owner', 'admin', 'poll_manager'].includes(role);
}

// Advanced analytics (demographics, option‑level data, trends) – for poll analysts, poll managers, admins, owners
export function canViewAdvancedAnalytics(role) {
  return ['owner', 'admin', 'poll_manager', 'analyst'].includes(role);
}

// Basic analytics (vote counts, simple results) – everyone can see
export function canViewBasicAnalytics(role) {
  return true;
}

// Team tab visibility – everyone can see the tab
export function canViewTeamTab(role) {
  return true;
}

// Whether the analytics tab should be visible in dashboard – always true for organization members
export function canAccessAnalyticsTab(role) {
  return true;
}