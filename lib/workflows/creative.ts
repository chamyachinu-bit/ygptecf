import { ROLE_LABELS } from '@/lib/utils/permissions'
import type {
  Event,
  EventReport,
  FlyerRequest,
  FlyerRequestStatus,
  Profile,
  SocialWorkflowItem,
  SocialWorkflowStatus,
} from '@/types/database'

export const FLYER_STATUSES: FlyerRequestStatus[] = [
  'requested',
  'in_progress',
  'submitted',
  'approved',
  'rejected',
  'released',
]

export const SOCIAL_STATUSES: SocialWorkflowStatus[] = [
  'requested',
  'in_progress',
  'submitted',
  'approved',
  'rejected',
  'completed',
]

export function getFlyerWorkflowPath() {
  return '/dashboard/flyer-requests'
}

export function getSocialWorkflowPath() {
  return '/dashboard/social-workflow'
}

export function prettyWorkflowStatus(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function isDesignerRole(role: Profile['role']) {
  return role === 'designer'
}

export function isSocialRole(role: Profile['role']) {
  return role === 'social_media_team'
}

export type FlyerWorkspaceRow = {
  event: Event
  workflow: FlyerRequest | null
  creatorName?: string
}

export type SocialWorkspaceRow = {
  event: Event
  report: EventReport
  workflow: SocialWorkflowItem | null
  creatorName?: string
}

export function buildFlyerNotificationMessage(event: Event, status: FlyerRequestStatus) {
  switch (status) {
    case 'submitted':
      return `Flyer draft submitted for "${event.title}". Review the creative link and approve or release when ready.`
    case 'approved':
      return `Flyer for "${event.title}" has been approved and is ready for release.`
    case 'released':
      return `Flyer for "${event.title}" has been released to the coordinator workflow.`
    case 'rejected':
      return `Flyer submission for "${event.title}" needs revisions before release.`
    default:
      return `Flyer workflow for "${event.title}" moved to ${prettyWorkflowStatus(status)}.`
  }
}

export function buildSocialNotificationMessage(event: Event, status: SocialWorkflowStatus) {
  switch (status) {
    case 'submitted':
      return `Social package submitted for "${event.title}". Review the content handoff and linked assets.`
    case 'approved':
      return `Social package for "${event.title}" has been approved.`
    case 'completed':
      return `Social documentation for "${event.title}" is completed and ready for use.`
    case 'rejected':
      return `Social package for "${event.title}" needs changes before completion.`
    default:
      return `Social workflow for "${event.title}" moved to ${prettyWorkflowStatus(status)}.`
  }
}

export function summarizeSocialNarrative(report: EventReport) {
  return [
    report.outcome_summary,
    report.execution_details,
    report.challenges,
    report.lessons_learned,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function roleLabel(role: Profile['role']) {
  return ROLE_LABELS[role]
}
