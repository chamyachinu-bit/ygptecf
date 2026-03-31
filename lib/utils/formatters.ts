import { format, formatDistanceToNow } from 'date-fns'
import type { EventStatus } from '@/types/database'

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
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
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  events_approved: 'bg-purple-100 text-purple-700',
  finance_approved: 'bg-indigo-100 text-indigo-700',
  funded: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-emerald-100 text-emerald-700',
  report_submitted: 'bg-cyan-100 text-cyan-700',
  archived: 'bg-gray-100 text-gray-500',
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
