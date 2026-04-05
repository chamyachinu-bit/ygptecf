import type { UserRole } from '@/types/database'

export const ROLE_LABELS: Record<UserRole, string> = {
  regional_coordinator: 'Regional Coordinator',
  events_team: 'Events Team',
  finance_team: 'Finance Team',
  accounts_team: 'Accounts Team',
  bot: 'Board of Trustees',
  designer: 'Designer',
  social_media_team: 'Social Media Team',
  admin: 'Admin',
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  regional_coordinator: [
    'events:create',
    'events:read:own',
    'history:read:own',
    'events:edit:draft',
    'files:upload',
    'reports:submit',
    'notifications:read:own',
  ],
  events_team: [
    'events:create',
    'events:read:submitted',
    'events:read:any',
    'history:read:any',
    'approvals:create:events_team',
    'files:read',
    'notifications:read:own',
  ],
  finance_team: [
    'events:read:events_approved',
    'events:read:any',
    'history:read:any',
    'approvals:create:finance_team',
    'budgets:read',
    'reports:read:any',
    'files:read',
    'notifications:read:own',
  ],
  accounts_team: [
    'events:read:finance_approved',
    'events:read:any',
    'history:read:any',
    'approvals:create:accounts_team',
    'budgets:read',
    'reports:read:any',
    'files:read',
    'notifications:read:own',
  ],
  bot: [
    'events:read:any',
    'history:read:any',
    'reports:read:any',
    'notifications:read:own',
  ],
  designer: [
    'workflow:flyer:read',
    'workflow:flyer:update',
    'notifications:read:own',
  ],
  social_media_team: [
    'workflow:social:read',
    'workflow:social:update',
    'notifications:read:own',
  ],
  admin: ['*'],
}

export function can(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  return perms.includes('*') || perms.includes(permission)
}

export function getApprovalStageForRole(role: UserRole): UserRole | null {
  const stages: Partial<Record<UserRole, UserRole>> = {
    events_team: 'events_team',
    finance_team: 'finance_team',
    accounts_team: 'accounts_team',
  }
  return stages[role] ?? null
}

// Which statuses a role is allowed to approve
export const ROLE_REVIEWABLE_STATUSES: Partial<Record<UserRole, string[]>> = {
  events_team: ['submitted'],
  finance_team: ['events_approved'],
  accounts_team: ['finance_approved'],
  admin: ['submitted', 'events_approved', 'finance_approved', 'on_hold', 'rejected', 'funded'],
}
