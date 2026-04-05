import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdvancedAnalytics } from '@/components/dashboard/AdvancedAnalytics'
import { ResultNavigation } from '@/components/ui/result-navigation'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  buildAnalysisRows,
  buildGoalData,
  buildMonthlyData,
  buildRegionData,
  filterAnalysisRows,
  getMonthLabel,
  summarizeStatus,
  type EventWithAnalyticsRelations,
} from '@/lib/analytics/event-analytics'
import type { EventReport, EventStatus, Profile } from '@/types/database'

type SearchParams = {
  q?: string
  month?: string
  region?: string
  status?: string
  goal?: string
  report_state?: string
  budget_band?: string
  variance?: string
  sort?: string
  detail_q?: string
  detail_size?: string
  detail_page?: string
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

  if (profile.role === 'designer') redirect('/dashboard/flyer-requests')
  if (profile.role === 'social_media_team') redirect('/dashboard/social-workflow')

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
  const events = (eventsData ?? []) as EventWithAnalyticsRelations[]
  const visibleEventIds = events.map((event) => event.id)

  const [reportsResult] = await Promise.all([
    visibleEventIds.length
      ? supabase.from('event_reports').select('*').in('event_id', visibleEventIds)
      : Promise.resolve({ data: [] as EventReport[] }),
  ])

  const reports = (reportsResult.data ?? []) as EventReport[]
  const rows = buildAnalysisRows(events, reports)
  const filteredRows = filterAnalysisRows(rows, filters)

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

  const monthlyData = buildMonthlyData(filteredRows)
  const regionData = buildRegionData(filteredRows)
  const goalData = buildGoalData(filteredRows)

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
    monthlyData[0] ?? { month: 'N/A', events: 0, funded: 0, completed: 0, plannedBudget: 0, actualBudget: 0, donations: 0, expectedAttendees: 0, actualAttendees: 0 }
  )
  const budgetUtilization = plannedBudget > 0 ? Math.round((actualBudget / plannedBudget) * 100) : 0
  const invoiceCoverage = totalEvents ? Math.round((filteredRows.filter((row) => row.invoiceCount > 0).length / totalEvents) * 100) : 0
  const overspendEvents = filteredRows.filter((row) => row.budgetVariance > 0).length
  const reportPending = filteredRows.filter((row) => !row.reportSubmitted).length
  const avgDonation = totalEvents ? Math.round(donations / totalEvents) : 0

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
  const detailQuery = (filters.detail_q ?? '').trim().toLowerCase()
  const detailSize = [10, 25, 50, 100].includes(Number(filters.detail_size)) ? Number(filters.detail_size) : 25
  const detailPage = Math.max(Number(filters.detail_page ?? '1') || 1, 1)
  const detailFilteredRows = filteredRows.filter((row) => {
    if (!detailQuery) return true
    const haystack = `${row.eventCode} ${row.title} ${row.region} ${row.goal}`.toLowerCase()
    return haystack.includes(detailQuery)
  })
  const detailPageCount = Math.max(1, Math.ceil(detailFilteredRows.length / detailSize))
  const safeDetailPage = Math.min(detailPage, detailPageCount)
  const detailVisibleRows = detailFilteredRows.slice((safeDetailPage - 1) * detailSize, safeDetailPage * detailSize)
  const detailQueryState = {
    q: filters.q ?? '',
    month: filters.month ?? '',
    region: filters.region ?? '',
    status: filters.status ?? '',
    goal: filters.goal ?? '',
    report_state: filters.report_state ?? '',
    budget_band: filters.budget_band ?? '',
    variance: filters.variance ?? '',
    sort: filters.sort ?? 'newest',
    detail_q: filters.detail_q ?? '',
    detail_size: detailSize,
    detail_page: safeDetailPage,
  }

  return (
    <div>
      <Header
        title="Leadership Analysis Center"
        subtitle="Study the event pipeline, finance movement, reporting quality, and operational health with role-aware visibility."
        eyebrow="Analytics"
        canCreate={can(profile.role, 'events:create')}
      />
      <PageShell>
        <SectionBlock
          title="Analysis Scope"
          subtitle="Filter by month, region, status, goal, or free-text search to compare operating windows cleanly."
        >
        <Card className="rounded-[1.5rem] border-slate-200/80">
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
              <select name="report_state" defaultValue={filters.report_state ?? ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All report states</option>
                <option value="reported">Reported only</option>
                <option value="pending">Report pending</option>
              </select>
              <select name="budget_band" defaultValue={filters.budget_band ?? ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All budget bands</option>
                <option value="light">Light: under Rs 25k</option>
                <option value="core">Core: Rs 25k-75k</option>
                <option value="major">Major: Rs 75k-1.5L</option>
                <option value="flagship">Flagship: above Rs 1.5L</option>
              </select>
              <select name="variance" defaultValue={filters.variance ?? ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All variance states</option>
                <option value="overspend">Overspend</option>
                <option value="savings">Savings</option>
                <option value="on_plan">On plan</option>
              </select>
              <select name="sort" defaultValue={filters.sort ?? 'newest'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="budget_desc">Highest budget</option>
                <option value="variance_desc">Largest variance</option>
                <option value="attendance_desc">Highest attendance</option>
              </select>
              <button className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Apply Filters
              </button>
              <a
                href={`/api/admin/analytics/export?${new URLSearchParams({
                  q: filters.q ?? '',
                  month: filters.month ?? '',
                  region: filters.region ?? '',
                  status: filters.status ?? '',
                  goal: filters.goal ?? '',
                  report_state: filters.report_state ?? '',
                  budget_band: filters.budget_band ?? '',
                  variance: filters.variance ?? '',
                  sort: filters.sort ?? 'newest',
                }).toString()}`}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </a>
            </form>
          </CardContent>
        </Card>
        </SectionBlock>

        <StatGrid className="xl:grid-cols-3">
          {summaryCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </StatGrid>

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
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Overspend exposure</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{overspendEvents}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Events where actuals are already above planned values.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Reporting gap</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{reportPending}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Visible events still missing a submitted completion report.
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
              <p>CSV export respects the active filter scope so BOT, Finance, and Admin can take audit-ready analysis snapshots.</p>
            </CardContent>
          </Card>
        </div>

        {filteredRows.length === 0 ? (
          <EmptyState
            title="No analytics rows match the current filters"
            message="Try widening the month, region, status, or goal filters to bring events back into scope."
          />
        ) : (
          <AdvancedAnalytics
            monthlyData={monthlyData}
            statusData={statusData}
            regionData={regionData}
            goalData={goalData}
          />
        )}

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

        <Card id="detailed-event-analysis">
          <CardHeader>
            <CardTitle>Detailed Event Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action="/dashboard/admin/analytics#detailed-event-analysis" className="grid gap-3 md:grid-cols-[1.6fr_auto]">
              <input type="hidden" name="q" value={filters.q ?? ''} />
              <input type="hidden" name="month" value={filters.month ?? ''} />
              <input type="hidden" name="region" value={filters.region ?? ''} />
              <input type="hidden" name="status" value={filters.status ?? ''} />
              <input type="hidden" name="goal" value={filters.goal ?? ''} />
              <input type="hidden" name="detail_size" value={String(detailSize)} />
              <input
                type="text"
                name="detail_q"
                defaultValue={filters.detail_q ?? ''}
                placeholder="Quick search event code, title, region, or goal"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
              />
              <button className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700">
                Search Rows
              </button>
            </form>

            <ResultNavigation
              pathname="/dashboard/admin/analytics"
              query={detailQueryState}
              sizeParam="detail_size"
              pageParam="detail_page"
              currentSize={detailSize}
              currentPage={safeDetailPage}
              totalCount={detailFilteredRows.length}
              label="Detailed Event Analysis"
              anchorId="detailed-event-analysis"
            />

            <div className="overflow-x-auto">
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
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Variance</th>
                    <th className="py-3 pr-4 text-xs uppercase text-gray-500">Invoices</th>
                  </tr>
                </thead>
              <tbody>
                {detailVisibleRows.map((row) => (
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
                    <td className={`py-3 pr-4 font-medium ${row.budgetVariance > 0 ? 'text-red-600' : row.budgetVariance < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                      {row.budgetVariance > 0 ? '+' : ''}{formatCurrency(row.budgetVariance)}
                    </td>
                    <td className="py-3 pr-4">{row.invoiceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}
