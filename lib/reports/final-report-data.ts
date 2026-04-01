import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Budget, Event, EventReport } from '@/types/database'

export interface FinalReportViewModel {
  event: Event
  report: EventReport
  budgets: Budget[]
  estimated: number
  actual: number
  variance: number
  actualAttendees: number
  attendeeVariance: number
  timingVariance: string | null
  driveLinks: Array<{ label: string; url: string | null | undefined }>
  timelineSteps: Array<{ label: string; value: string; done: boolean }>
  changeSummary: string
}

export function buildFinalReportViewModel(event: Event, report: EventReport): FinalReportViewModel {
  const budgets = (event.budgets ?? []) as Budget[]
  const estimated = budgets.reduce((sum, line) => sum + Number(line.estimated_amount || 0), 0)
  const actual = budgets.reduce((sum, line) => sum + Number(line.actual_amount || 0), 0)
  const variance = actual - estimated
  const actualAttendees = report.actual_attendees ?? 0
  const attendeeVariance = actualAttendees - Number(event.expected_attendees || 0)
  const timingVariance =
    report.actual_start_time && event.start_time && report.actual_start_time !== event.start_time
      ? `${event.start_time} planned / ${report.actual_start_time} actual`
      : null

  const driveLinks = [
    { label: 'Proposal Folder', url: event.proposal_drive_url },
    { label: 'Media Folder', url: event.media_drive_url },
    { label: 'Report Folder', url: event.report_drive_url },
    { label: 'Invoice Folder', url: event.invoice_drive_url },
  ]

  const timelineSteps = [
    { label: 'Proposal Created', value: formatDate(event.created_at), done: true },
    { label: 'Submitted', value: event.submitted_at ? formatDate(event.submitted_at) : 'Pending', done: !!event.submitted_at },
    { label: 'Completed', value: event.completed_at ? formatDate(event.completed_at) : 'Pending', done: !!event.completed_at },
    { label: 'Report Ready', value: report.created_at ? formatDate(report.created_at) : 'Pending', done: !!report.created_at },
  ]

  const changeSummary = [
    attendeeVariance !== 0
      ? `Attendance changed by ${attendeeVariance >= 0 ? '+' : ''}${attendeeVariance} compared with the proposal.`
      : 'Attendance matched the proposal target closely.',
    variance !== 0
      ? `Budget variance was ${variance > 0 ? 'an overspend' : 'a saving'} of ${formatCurrency(Math.abs(variance))}.`
      : 'Budget tracked exactly to plan.',
    report.actual_location && report.actual_location !== event.location
      ? 'The actual venue changed from the original proposal location.'
      : 'The event was held at the planned location.',
    timingVariance ? `Timing changed: ${timingVariance}.` : 'Timing stayed aligned with the proposal.',
  ].join(' ')

  return {
    event,
    report,
    budgets,
    estimated,
    actual,
    variance,
    actualAttendees,
    attendeeVariance,
    timingVariance,
    driveLinks,
    timelineSteps,
    changeSummary,
  }
}
