import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { FileText, FolderOpen, TrendingUp, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ResultNavigation } from '@/components/ui/result-navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GeneratePdfButton } from '@/components/reports/PrintReportButton'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import { buildFinalReportViewModel } from '@/lib/reports/final-report-data'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Budget, Event, EventReport, Profile } from '@/types/database'

type SearchParams = {
  q?: string
  region?: string
  status?: string
  report_size?: string
  report_page?: string
}

type EventWithRelations = Event & {
  budgets?: Budget[]
}

export default async function ReportsWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  if (!(can(profile.role, 'reports:read:any') || profile.role === 'regional_coordinator')) {
    redirect('/dashboard')
  }

  let eventsQuery = supabase
    .from('events')
    .select('*, budgets(*)')
    .in('status', ['completed', 'report_submitted', 'archived'])
    .order('event_date', { ascending: false })

  if (profile.role === 'regional_coordinator') {
    eventsQuery = eventsQuery.eq('created_by', user.id)
  }

  const { data: eventsData } = await eventsQuery
  const events = (eventsData ?? []) as EventWithRelations[]
  const eventIds = events.map((event) => event.id)
  const { data: reportsData } = eventIds.length
    ? await supabase.from('event_reports').select('*').in('event_id', eventIds)
    : { data: [] as EventReport[] }

  const reports = (reportsData ?? []) as EventReport[]
  const reportByEventId = new Map<string, EventReport>()
  reports.forEach((report) => {
    const existing = reportByEventId.get(report.event_id)
    if (!existing || report.created_at > existing.created_at) {
      reportByEventId.set(report.event_id, report)
    }
  })

  const rows = events
    .map((event) => {
      const report = reportByEventId.get(event.id)
      if (!report) return null
      const model = buildFinalReportViewModel({ ...event, budgets: event.budgets ?? [] }, report)
      return {
        id: event.id,
        eventCode: event.event_code ?? 'Pending code',
        title: event.title,
        region: event.region,
        status: event.status,
        eventDate: event.event_date,
        reportCreatedAt: report.created_at,
        expectedAttendees: event.expected_attendees ?? 0,
        actualAttendees: model.actualAttendees,
        plannedBudget: model.estimated,
        actualBudget: model.actual,
        variance: model.variance,
        donations: report.donations_received ?? 0,
        driveLinks: model.driveLinks,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const query = (filters.q ?? '').trim().toLowerCase()
  const filteredRows = rows.filter((row) => {
    if (!row) return false
    const haystack = `${row.eventCode} ${row.title} ${row.region}`.toLowerCase()
    const matchesQuery = !query || haystack.includes(query)
    const matchesRegion = !filters.region || row.region === filters.region
    const matchesStatus = !filters.status || row.status === filters.status
    return matchesQuery && matchesRegion && matchesStatus
  })

  const size = [10, 25, 50, 100].includes(Number(filters.report_size)) ? Number(filters.report_size) : 25
  const page = Math.max(Number(filters.report_page ?? '1') || 1, 1)
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / size))
  const safePage = Math.min(page, pageCount)
  const visibleRows = filteredRows.slice((safePage - 1) * size, safePage * size)

  const totalPlanned = filteredRows.reduce((sum, row) => sum + row.plannedBudget, 0)
  const totalActual = filteredRows.reduce((sum, row) => sum + row.actualBudget, 0)
  const totalVariance = totalActual - totalPlanned

  const regionOptions = [...new Set(rows.map((row) => row?.region).filter(Boolean))].sort((a, b) => a!.localeCompare(b!))
  const statusOptions = [...new Set(rows.map((row) => row?.status).filter(Boolean))]

  return (
    <div>
      <Header
        title="Reports Workspace"
        subtitle={`Signed in as ${ROLE_LABELS[profile.role]}. Use this space to open final reports, compare delivery outcomes, and export stakeholder-ready PDFs quickly.`}
        eyebrow="Reporting"
        canCreate={false}
      />
      <PageShell>
        <StatGrid>
          <StatCard label="Reports In Scope" value={String(filteredRows.length)} helper="Available final-report records" />
          <StatCard label="Planned Budget" value={formatCurrency(totalPlanned)} helper={`Actual ${formatCurrency(totalActual)}`} />
          <StatCard label="Portfolio Variance" value={formatCurrency(totalVariance)} helper="Across visible reported events" />
          <StatCard label="Average Actual Attendance" value={filteredRows.length ? String(Math.round(filteredRows.reduce((sum, row) => sum + row.actualAttendees, 0) / filteredRows.length)) : '0'} helper="Across currently filtered reports" />
        </StatGrid>

        <SectionBlock
          title="Reported events"
          subtitle="Search the reported portfolio, open the web final report, and generate polished PDF exports for BOT and operational review."
        >
          {rows.length === 0 ? (
            <EmptyState
              title="No reports are available yet"
              message="Final reports appear here once an ECR has been submitted for a completed event."
            />
          ) : (
            <div className="space-y-4" id="reports-workspace">
              <form action="/dashboard/reports#reports-workspace" className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
                <input
                  type="text"
                  name="q"
                  defaultValue={filters.q ?? ''}
                  placeholder="Search event code, title, or region"
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
                />
                <select
                  name="region"
                  defaultValue={filters.region ?? ''}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
                >
                  <option value="">All regions</option>
                  {regionOptions.map((region) => (
                    <option key={region} value={region ?? ''}>
                      {region}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={filters.status ?? ''}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status ?? ''}>
                      {String(status).replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
                <button className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700">
                  Search Reports
                </button>
              </form>

              <ResultNavigation
                pathname="/dashboard/reports"
                query={{
                  q: filters.q ?? '',
                  region: filters.region ?? '',
                  status: filters.status ?? '',
                  report_size: size,
                  report_page: safePage,
                }}
                sizeParam="report_size"
                pageParam="report_page"
                currentSize={size}
                currentPage={safePage}
                totalCount={filteredRows.length}
                label="Available reports"
                anchorId="reports-workspace"
              />

              <div className="grid gap-4 xl:grid-cols-2">
                {visibleRows.map((row) => (
                  <Card key={row.id} className="overflow-hidden rounded-[1.5rem] border-slate-200/80">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{row.eventCode}</p>
                          <CardTitle className="mt-2 text-lg">{row.title}</CardTitle>
                          <p className="mt-1 text-sm text-slate-500">
                            {row.region} · {formatDate(row.eventDate)} · {row.status.replaceAll('_', ' ')}
                          </p>
                        </div>
                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Final report ready
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MiniMetric icon={<Users className="h-4 w-4" />} label="Attendees" value={`${row.expectedAttendees} / ${row.actualAttendees}`} />
                        <MiniMetric icon={<TrendingUp className="h-4 w-4" />} label="Variance" value={formatCurrency(row.variance)} />
                        <MiniMetric icon={<FileText className="h-4 w-4" />} label="Donations" value={formatCurrency(row.donations)} />
                        <MiniMetric icon={<FolderOpen className="h-4 w-4" />} label="Drive Links" value={String(row.driveLinks.filter((link) => !!link.url).length)} />
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Planned</p>
                          <p className="mt-2 font-semibold text-slate-900">{formatCurrency(row.plannedBudget)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actual</p>
                          <p className="mt-2 font-semibold text-slate-900">{formatCurrency(row.actualBudget)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Report Date</p>
                          <p className="mt-2 font-semibold text-slate-900">{formatDate(row.reportCreatedAt)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dashboard/events/${row.id}/final-report`}>
                          <span className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 text-sm font-medium text-white shadow-[0_14px_28px_rgba(22,163,74,0.18)]">
                            Open Final Report
                          </span>
                        </Link>
                        <GeneratePdfButton href={`/api/events/${row.id}/final-report-pdf`} />
                        <Link href={`/dashboard/events/${row.id}`}>
                          <span className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm">
                            Open Event
                          </span>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </SectionBlock>
      </PageShell>
    </div>
  )
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}
