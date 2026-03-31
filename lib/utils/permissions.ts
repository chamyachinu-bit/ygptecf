import type { UserRole } from '@/types/database'

export const ROLE_LABELS: Record<UserRole, string> = {
  regional_coordinator: 'Regional Coordinator',
  events_team: 'Events Team',
  finance_team: 'Finance Team',
  accounts_team: 'Accounts Team',
  admin: 'Admin',
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  regional_coordinator: [
    'events:create',
    'events:read:own',
    'events:edit:draft',
    'files:upload',
    'reports:submit',
    'notifications:read:own',
  ],
  events_team: [
    'events:read:submitted',
    'events:read:any',
    'approvals:create:events_team',
    'files:read',
    'notifications:read:own',
  ],
  finance_team: [
    'events:read:events_approved',
    'events:read:any',
    'approvals:create:finance_team',
    'budgets:read',
    'files:read',
    'notifications:read:own',
  ],
  accounts_team: [
    'events:read:finance_approved',
    'events:read:any',
    'approvals:create:accounts_team',
    'budgets:read',
    'files:read',
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
}
