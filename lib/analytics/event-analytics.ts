import type { Event, EventReport, EventStatus } from '@/types/database'

export type EventWithAnalyticsRelations = Event & {
  budgets?: Event['budgets']
  files?: Event['files']
}

export type EventAnalysisRow = {
  id: string
  eventCode: string
  title: string
  region: string
  goal: string
  status: EventStatus
  monthKey: string
  monthLabel: string
  eventDate: string | null
  createdAt: string
  expectedAttendees: number
  actualAttendees: number
  plannedBudget: number
  actualBudget: number
  budgetVariance: number
  donations: number
  reportSubmitted: boolean
  invoiceCount: number
}

export type AnalyticsFilters = {
  q?: string
  month?: string
  region?: string
  status?: string
  goal?: string
  report_state?: string
  budget_band?: string
  variance?: string
  sort?: string
}

export type MonthlyAnalyticsPoint = {
  month: string
  events: number
  funded: number
  completed: number
  plannedBudget: number
  actualBudget: number
  donations: number
  expectedAttendees: number
  actualAttendees: number
}

export type RegionAnalyticsPoint = {
  region: string
  events: number
  plannedBudget: number
  actualBudget: number
  completed: number
  expectedAttendees: number
  actualAttendees: number
}

export type GoalAnalyticsPoint = {
  goal: string
  events: number
}

export function getMonthKey(date: string | null | undefined, fallback: string) {
  const base = date ? new Date(`${date}T00:00:00`) : new Date(fallback)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

export function summarizeStatus(status: EventStatus) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function resolveBudgetBand(plannedBudget: number) {
  if (plannedBudget < 25000) return 'light'
  if (plannedBudget < 75000) return 'core'
  if (plannedBudget < 150000) return 'major'
  return 'flagship'
}

export function buildAnalysisRows(events: EventWithAnalyticsRelations[], reports: EventReport[]) {
  const reportByEventId = new Map(reports.map((report) => [report.event_id, report]))

  return events.map((event) => {
    const report = reportByEventId.get(event.id)
    const plannedBudget = event.budgets?.reduce((sum, line) => sum + line.estimated_amount, 0) ?? 0
    const actualBudget = event.budgets?.reduce((sum, line) => sum + (line.actual_amount ?? 0), 0) ?? 0
    const monthKey = getMonthKey(event.event_date, event.created_at)

    return {
      id: event.id,
      eventCode: event.event_code ?? 'Pending code',
      title: event.title,
      region: event.region,
      goal: event.goal ?? 'Unspecified',
      status: event.status,
      monthKey,
      monthLabel: getMonthLabel(monthKey),
      eventDate: event.event_date ?? null,
      createdAt: event.created_at,
      expectedAttendees: event.expected_attendees ?? 0,
      actualAttendees: report?.actual_attendees ?? 0,
      plannedBudget,
      actualBudget,
      budgetVariance: actualBudget - plannedBudget,
      donations: report?.donations_received ?? 0,
      reportSubmitted: Boolean(report),
      invoiceCount: event.files?.filter((file) => file.file_type === 'invoice_document').length ?? 0,
    } satisfies EventAnalysisRow
  })
}

export function filterAnalysisRows(rows: EventAnalysisRow[], filters: AnalyticsFilters) {
  const query = (filters.q ?? '').trim().toLowerCase()
  const reportState = filters.report_state ?? ''
  const budgetBand = filters.budget_band ?? ''
  const varianceFilter = filters.variance ?? ''

  const filtered = rows.filter((row) => {
    const haystack = `${row.eventCode} ${row.title} ${row.region} ${row.goal}`.toLowerCase()
    const matchesSearch = !query || haystack.includes(query)
    const matchesMonth = !filters.month || row.monthKey === filters.month
    const matchesRegion = !filters.region || row.region === filters.region
    const matchesStatus = !filters.status || row.status === filters.status
    const matchesGoal = !filters.goal || row.goal === filters.goal
    const matchesReport =
      !reportState ||
      (reportState === 'reported' && row.reportSubmitted) ||
      (reportState === 'pending' && !row.reportSubmitted)
    const matchesBudgetBand = !budgetBand || resolveBudgetBand(row.plannedBudget) === budgetBand
    const matchesVariance =
      !varianceFilter ||
      (varianceFilter === 'overspend' && row.budgetVariance > 0) ||
      (varianceFilter === 'savings' && row.budgetVariance < 0) ||
      (varianceFilter === 'on_plan' && row.budgetVariance === 0)

    return (
      matchesSearch &&
      matchesMonth &&
      matchesRegion &&
      matchesStatus &&
      matchesGoal &&
      matchesReport &&
      matchesBudgetBand &&
      matchesVariance
    )
  })

  return sortAnalysisRows(filtered, filters.sort)
}

export function sortAnalysisRows(rows: EventAnalysisRow[], sort: string | undefined) {
  const next = [...rows]
  switch (sort) {
    case 'oldest':
      return next.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    case 'budget_desc':
      return next.sort((a, b) => b.plannedBudget - a.plannedBudget)
    case 'variance_desc':
      return next.sort((a, b) => Math.abs(b.budgetVariance) - Math.abs(a.budgetVariance))
    case 'attendance_desc':
      return next.sort((a, b) => (b.actualAttendees || b.expectedAttendees) - (a.actualAttendees || a.expectedAttendees))
    case 'newest':
    default:
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

export function buildMonthlyData(rows: EventAnalysisRow[]): MonthlyAnalyticsPoint[] {
  const monthMap = new Map<string, MonthlyAnalyticsPoint>()

  rows.forEach((row) => {
    const bucket = monthMap.get(row.monthKey) ?? {
      month: row.monthLabel,
      events: 0,
      funded: 0,
      completed: 0,
      plannedBudget: 0,
      actualBudget: 0,
      donations: 0,
      expectedAttendees: 0,
      actualAttendees: 0,
    }
    bucket.events += 1
    if (row.status === 'funded') bucket.funded += 1
    if (['completed', 'report_submitted', 'archived'].includes(row.status)) bucket.completed += 1
    bucket.plannedBudget += row.plannedBudget
    bucket.actualBudget += row.actualBudget
    bucket.donations += row.donations
    bucket.expectedAttendees += row.expectedAttendees
    bucket.actualAttendees += row.actualAttendees
    monthMap.set(row.monthKey, bucket)
  })

  return Array.from(monthMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-12)
    .map(([, value]) => value)
}

export function buildRegionData(rows: EventAnalysisRow[]): RegionAnalyticsPoint[] {
  const regionMap = new Map<string, RegionAnalyticsPoint>()

  rows.forEach((row) => {
    const bucket = regionMap.get(row.region) ?? {
      region: row.region,
      events: 0,
      plannedBudget: 0,
      actualBudget: 0,
      completed: 0,
      expectedAttendees: 0,
      actualAttendees: 0,
    }
    bucket.events += 1
    bucket.plannedBudget += row.plannedBudget
    bucket.actualBudget += row.actualBudget
    bucket.expectedAttendees += row.expectedAttendees
    bucket.actualAttendees += row.actualAttendees
    if (['completed', 'report_submitted', 'archived'].includes(row.status)) bucket.completed += 1
    regionMap.set(row.region, bucket)
  })

  return Array.from(regionMap.values()).sort((a, b) => b.events - a.events)
}

export function buildGoalData(rows: EventAnalysisRow[]): GoalAnalyticsPoint[] {
  const goalMap = new Map<string, number>()
  rows.forEach((row) => {
    goalMap.set(row.goal, (goalMap.get(row.goal) ?? 0) + 1)
  })
  return Array.from(goalMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([goal, events]) => ({ goal, events }))
}

export function toAnalyticsCsv(rows: EventAnalysisRow[]) {
  const headers = [
    'Event Code',
    'Title',
    'Region',
    'Goal',
    'Status',
    'Month',
    'Expected Attendees',
    'Actual Attendees',
    'Planned Budget',
    'Actual Budget',
    'Variance',
    'Donations',
    'Report Submitted',
    'Invoice Count',
  ]

  const escape = (value: string | number | boolean) => `"${String(value).replace(/"/g, '""')}"`

  return [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.eventCode,
        row.title,
        row.region,
        row.goal,
        summarizeStatus(row.status),
        row.monthLabel,
        row.expectedAttendees,
        row.actualAttendees,
        row.plannedBudget,
        row.actualBudget,
        row.budgetVariance,
        row.donations,
        row.reportSubmitted ? 'Yes' : 'No',
        row.invoiceCount,
      ]
        .map(escape)
        .join(',')
    ),
  ].join('\n')
}
