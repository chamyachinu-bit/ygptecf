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
  draft: 'border border-slate-200 bg-slate-100/90 text-slate-700',
  submitted: 'border border-sky-200 bg-sky-100/90 text-sky-700',
  events_approved: 'border border-violet-200 bg-violet-100/90 text-violet-700',
  finance_approved: 'border border-indigo-200 bg-indigo-100/90 text-indigo-700',
  funded: 'border border-emerald-200 bg-emerald-100/90 text-emerald-700',
  rejected: 'border border-rose-200 bg-rose-100/90 text-rose-700',
  on_hold: 'border border-amber-200 bg-amber-100/90 text-amber-700',
  completed: 'border border-teal-200 bg-teal-100/90 text-teal-700',
  report_submitted: 'border border-cyan-200 bg-cyan-100/90 text-cyan-700',
  archived: 'border border-slate-200 bg-slate-100/90 text-slate-500',
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
