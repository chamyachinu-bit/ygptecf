import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdvancedAnalytics } from '@/components/dashboard/AdvancedAnalytics'
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Event, EventReport, EventStatus, Profile, UserRole } from '@/types/database'

type SearchParams = {
  q?: string
  month?: string
  region?: string
  status?: string
  goal?: string
}

type EventWithRelations = Event & {
  budgets?: Event['budgets']
}

type EventAnalysisRow = {
  id: string
  eventCode: string
  title: string
  region: string
  goal: string
  status: EventStatus
  monthKey: string
  monthLabel: string
  expectedAttendees: number
  actualAttendees: number
  plannedBudget: number
  actualBudget: number
  donations: number
  reportSubmitted: boolean
  invoiceCount: number
}

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: '#9ca3af',
  submitted: '#3b82f6',
  events_approved: '#8b5cf6',
  finance_approved: '#6366f1',
  funded: '#16a34a',
  rejected: '#dc2626',
  on_hold: '#d97706',
  completed: '#0f766e',
  report_submitted: '#0891b2',
  archived: '#6b7280',
}

function getMonthKey(date: string | null | undefined, fallback: string) {
  const base = date ? new Date(`${date}T00:00:00`) : new Date(fallback)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

function summarizeStatus(status: EventStatus) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  let eventsQuery = supabase
    .from('events')
    .select('*, budgets(*), files(*)')
    .order('created_at', { ascending: false })

  if (profile.role === 'regional_coordinator') {
    eventsQuery = eventsQuery.eq('created_by', user.id)
  } else if (profile.role !== 'admin') {
    eventsQuery = eventsQuery.neq('status', 'draft')
  }

  const { data: eventsData } = await eventsQuery
  const events = (eventsData ?? []) as EventWithRelations[]
  const visibleEventIds = events.map((event) => event.id)

  const [reportsResult] = await Promise.all([
    visibleEventIds.length
      ? supabase.from('event_reports').select('*').in('event_id', visibleEventIds)
      : Promise.resolve({ data: [] as EventReport[] }),
  ])

  const reports = (reportsResult.data ?? []) as EventReport[]
  const reportByEventId = new Map(reports.map((report) => [report.event_id, report]))

  const rows: EventAnalysisRow[] = events.map((event) => {
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
      expectedAttendees: event.expected_attendees ?? 0,
      actualAttendees: report?.actual_attendees ?? 0,
      plannedBudget,
      actualBudget,
      donations: report?.donations_received ?? 0,
      reportSubmitted: Boolean(report),
      invoiceCount: event.files?.filter((file) => file.file_type === 'invoice_document').length ?? 0,
    }
  })

  const filteredRows = rows.filter((row) => {
    const haystack = `${row.eventCode} ${row.title} ${row.region} ${row.goal}`.toLowerCase()
    const matchesSearch = !filters.q || haystack.includes(filters.q.toLowerCase())
    const matchesMonth = !filters.month || row.monthKey === filters.month
    const matchesRegion = !filters.region || row.region === filters.region
    const matchesStatus = !filters.status || row.status === filters.status
    const matchesGoal = !filters.goal || row.goal === filters.goal
    return matchesSearch && matchesMonth && matchesRegion && matchesStatus && matchesGoal
  })

  const totalEvents = filteredRows.length
  const fundedEvents = filteredRows.filter((row) => row.status === 'funded').length
  const completedEvents = filteredRows.filter((row) => ['completed', 'report_submitted', 'archived'].includes(row.status)).length
  const onHoldEvents = filteredRows.filter((row) => row.status === 'on_hold').length
  const rejectedEvents = filteredRows.filter((row) => row.status === 'rejected').length
  const plannedBudget = filteredRows.reduce((sum, row) => sum + row.plannedBudget, 0)
  const actualBudget = filteredRows.reduce((sum, row) => sum + row.actualBudget, 0)
  const donations = filteredRows.reduce((sum, row) => sum + row.donations, 0)
  const reportSubmissionRate = totalEvents ? Math.round((filteredRows.filter((row) => row.reportSubmitted).length / totalEvents) * 100) : 0
  const completionRate = totalEvents ? Math.round((completedEvents / totalEvents) * 100) : 0
  const avgExpectedAttendees = totalEvents ? Math.round(filteredRows.reduce((sum, row) => sum + row.expectedAttendees, 0) / totalEvents) : 0
  const avgActualAttendees = filteredRows.filter((row) => row.actualAttendees > 0).length
    ? Math.round(
        filteredRows.reduce((sum, row) => sum + row.actualAttendees, 0) /
          filteredRows.filter((row) => row.actualAttendees > 0).length
      )
    : 0

  const monthMap = new Map<string, {
    month: string
    events: number
    funded: number
    completed: number
    plannedBudget: number
    actualBudget: number
    donations: number
  }>()

  filteredRows.forEach((row) => {
    const bucket = monthMap.get(row.monthKey) ?? {
      month: row.monthLabel,
      events: 0,
      funded: 0,
      completed: 0,
      plannedBudget: 0,
      actualBudget: 0,
      donations: 0,
    }
    bucket.events += 1
    if (row.status === 'funded') bucket.funded += 1
    if (['completed', 'report_submitted', 'archived'].includes(row.status)) bucket.completed += 1
    bucket.plannedBudget += row.plannedBudget
    bucket.actualBudget += row.actualBudget
    bucket.donations += row.donations
    monthMap.set(row.monthKey, bucket)
  })

  const monthlyData = Array.from(monthMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-12)
    .map(([, value]) => value)

  const regionMap = new Map<string, { region: string; events: number; plannedBudget: number; actualBudget: number; completed: number }>()
  filteredRows.forEach((row) => {
    const bucket = regionMap.get(row.region) ?? {
      region: row.region,
      events: 0,
      plannedBudget: 0,
      actualBudget: 0,
      completed: 0,
    }
    bucket.events += 1
    bucket.plannedBudget += row.plannedBudget
    bucket.actualBudget += row.actualBudget
    if (['completed', 'report_submitted', 'archived'].includes(row.status)) bucket.completed += 1
    regionMap.set(row.region, bucket)
  })
  const regionData = Array.from(regionMap.values()).sort((a, b) => b.events - a.events)

  const goalMap = new Map<string, number>()
  filteredRows.forEach((row) => {
    goalMap.set(row.goal, (goalMap.get(row.goal) ?? 0) + 1)
  })
  const goalData = Array.from(goalMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([goal, events]) => ({ goal, events }))

  const statusMap = new Map<EventStatus, number>()
  filteredRows.forEach((row) => {
    statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1)
  })
  const statusData = Array.from(statusMap.entries()).map(([status, value]) => ({
    name: summarizeStatus(status),
    value,
    color: STATUS_COLORS[status],
  }))

  const topRegion = regionData[0]?.region ?? 'N/A'
  const strongestMonth = monthlyData.reduce(
    (best, row) => (row.events > best.events ? row : best),
    monthlyData[0] ?? { month: 'N/A', events: 0, funded: 0, completed: 0, plannedBudget: 0, actualBudget: 0, donations: 0 }
  )
  const budgetUtilization = plannedBudget > 0 ? Math.round((actualBudget / plannedBudget) * 100) : 0
  const invoiceCoverage = totalEvents ? Math.round((filteredRows.filter((row) => row.invoiceCount > 0).length / totalEvents) * 100) : 0

  const summaryCards = [
    { label: 'Events In Scope', value: totalEvents.toString(), helper: `${profile.role === 'admin' ? 'System-wide' : ROLE_LABELS[profile.role]} view` },
    { label: 'Completion Rate', value: `${completionRate}%`, helper: `${completedEvents} completed or reported` },
    { label: 'Report Submission Rate', value: `${reportSubmissionRate}%`, helper: 'Completion reports captured' },
    { label: 'Planned Budget', value: formatCurrency(plannedBudget), helper: `Actual spend ${formatCurrency(actualBudget)}` },
    { label: 'Donations Logged', value: formatCurrency(donations), helper: `${invoiceCoverage}% events with invoices` },
    { label: 'Average Attendance', value: `${avgActualAttendees || avgExpectedAttendees}`, helper: avgActualAttendees ? 'Actual attendance average' : 'Expected attendance average' },
  ]

  const regionOptions = [...new Set(rows.map((row) => row.region))].sort((a, b) => a.localeCompare(b))
  const statusOptions = [...new Set(rows.map((row) => row.status))]
  const goalOptions = [...new Set(rows.map((row) => row.goal))].sort((a, b) => a.localeCompare(b))
  const monthOptions = [...new Set(rows.map((row) => row.monthKey))].sort((a, b) => a.localeCompare(b))

  return (
    <div>
      <Header title="Leadership Analysis Center" canCreate={can(profile.role, 'events:create')} />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Signed in as <strong>{ROLE_LABELS[profile.role]}</strong>. This analysis view respects role privacy:
              admins see the full system, coordinators see only their own events, and review teams see the events visible to their workflow role.
            </p>
            <form className="grid gap-3 md:grid-cols-5">
              <input
                type="text"
                name="q"
                defaultValue={filters.q ?? ''}
                placeholder="Search code, title, region, goal"
                className="md:col-span-2 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <select name="month" defaultValue={filters.month ?? ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All months</option>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>{getMonthLabel(month)}</option>
                ))}
              </select>
              <select name="region" defaultValue={filters.region ?? ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All regions</option>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <select name="status" defaultValue={filters.status ?? ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{summarizeStatus(status)}</option>
                ))}
              </select>
              <select name="goal" defaultValue={filters.goal ?? ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All goals</option>
                {goalOptions.map((goal) => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
              <button className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Apply Filters
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="space-y-1 p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Leadership Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Top operating region</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{topRegion}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Highest event volume in the current filter scope.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Strongest month</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{strongestMonth.month}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {strongestMonth.events} events, {strongestMonth.funded} funded, {strongestMonth.completed} completed.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Budget utilization</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{budgetUtilization}%</p>
                <p className="mt-1 text-sm text-gray-600">
                  Actual spend versus planned commitment in the filtered dataset.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Risk flags</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{onHoldEvents + rejectedEvents}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {onHoldEvents} on hold, {rejectedEvents} rejected.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analysis Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>Use month, region, status, and goal filters to study different operating windows for leadership review.</p>
              <p>This view combines event pipeline, financial movement, attendance, donation capture, and report completion signals.</p>
              <p>Invoice coverage helps leadership understand whether supporting finance documentation is being uploaded alongside execution evidence.</p>
            </CardContent>
          </Card>
        </div>

        <AdvancedAnalytics
          monthlyData={monthlyData}
          statusData={statusData}
          regionData={regionData}
          goalData={goalData}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Month-wise Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Month</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Events</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Funded</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Completed</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Planned</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row) => (
                    <tr key={row.month} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-900">{row.month}</td>
                      <td className="py-3 pr-4">{row.events}</td>
                      <td className="py-3 pr-4">{row.funded}</td>
                      <td className="py-3 pr-4">{row.completed}</td>
                      <td className="py-3 pr-4">{formatCurrency(row.plannedBudget)}</td>
                      <td className="py-3 pr-4">{formatCurrency(row.actualBudget)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Region Analysis</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Region</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Events</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Completion</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Planned</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {regionData.map((row) => (
                    <tr key={row.region} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-900">{row.region}</td>
                      <td className="py-3 pr-4">{row.events}</td>
                      <td className="py-3 pr-4">{row.events ? Math.round((row.completed / row.events) * 100) : 0}%</td>
                      <td className="py-3 pr-4">{formatCurrency(row.plannedBudget)}</td>
                      <td className="py-3 pr-4">{formatCurrency(row.actualBudget)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Event Analysis</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Event</th>
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Month</th>
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Status</th>
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Goal</th>
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Expected / Actual</th>
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Planned / Actual Budget</th>
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Donations</th>
                  <th className="py-3 pr-4 text-xs uppercase text-gray-500">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900">{row.eventCode}</div>
                      <div className="text-gray-500">{row.title}</div>
                      <div className="text-xs text-gray-400">{row.region}</div>
                    </td>
                    <td className="py-3 pr-4">{row.monthLabel}</td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex rounded-full px-2 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: STATUS_COLORS[row.status] }}
                      >
                        {summarizeStatus(row.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{row.goal}</td>
                    <td className="py-3 pr-4">{row.expectedAttendees} / {row.actualAttendees || '-'}</td>
                    <td className="py-3 pr-4">
                      <div>{formatCurrency(row.plannedBudget)}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(row.actualBudget)}</div>
                    </td>
                    <td className="py-3 pr-4">{formatCurrency(row.donations)}</td>
                    <td className="py-3 pr-4">{row.invoiceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
