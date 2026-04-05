import { format, formatDistanceToNow } from 'date-fns'
import type { EventStatus } from '@/types/database'

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  events_approved: 'Events Approved',
  finance_approved: 'Finance Approved',
  funded: 'Funded',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  completed: 'Completed',
  report_submitted: 'Report Submitted',
  archived: 'Archived',
}

export const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'app-panel-soft app-text-muted border',
  submitted: 'app-info-soft',
  events_approved: 'app-accent-soft',
  finance_approved: 'app-accent-soft',
  funded: 'app-success-soft',
  rejected: 'app-danger-soft',
  on_hold: 'app-warning-soft',
  completed: 'app-success-soft',
  report_submitted: 'app-info-soft',
  archived: 'app-panel-soft app-text-subtle border',
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
