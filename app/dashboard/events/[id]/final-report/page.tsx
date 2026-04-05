import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  IndianRupee,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GeneratePdfButton } from '@/components/reports/PrintReportButton'
import { buildFinalReportViewModel } from '@/lib/reports/final-report-data'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Budget, EventReport, Profile } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string; print?: string }>
}

const VIEW_LABELS = {
  comparison: 'Comparison',
  epf: 'EPF',
  ecr: 'ECR',
} as const

type ViewMode = keyof typeof VIEW_LABELS

export default async function FinalReportPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams
  const selectedView = (query.view as ViewMode | undefined) ?? 'comparison'
  const view = (selectedView in VIEW_LABELS ? selectedView : 'comparison') as ViewMode
  const printMode = query.print === '1'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profileData }, { data: eventData }, { data: reportData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('events').select('*, budgets(*)').eq('id', id).single(),
    supabase.from('event_reports').select('*').eq('event_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const profile = profileData as Profile | null
  const event = eventData

  if (!event || !profile) notFound()
  if (profile.role === 'designer') redirect('/dashboard/flyer-requests')
  if (profile.role === 'social_media_team') redirect('/dashboard/social-workflow')

  const report = (reportData ?? null) as EventReport | null
  const reportModel = report
    ? buildFinalReportViewModel(
        {
          ...event,
          budgets: (event.budgets ?? []) as Budget[],
        },
        report
      )
    : null

  if (!report) {
    return (
      <div>
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/events/${id}`}>
              <button className="rounded p-1.5 hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Final Event Completion Report</h1>
              <p className="text-sm text-gray-500">{event.event_code} - {event.title}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl p-6">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle>Final report not available yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-900">
                This event does not have a submitted Event Completion Report yet, so the final report cannot be generated. Submit or update the ECR first, then return here to review the full leadership-ready report.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/events/${id}/report`}>
                  <Button>Open Report Editor</Button>
                </Link>
                <Link href={`/dashboard/events/${id}`}>
                  <Button variant="outline">Back to Event</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={printMode ? 'bg-white print:bg-white' : ''}>
      <div className="border-b border-gray-200 bg-white px-6 py-4 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/events/${id}`}>
              <button className="rounded p-1.5 hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Final Event Completion Report</h1>
              <p className="text-sm text-gray-500">{event.event_code} - {event.title}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/events/${id}/report`}>
              <Button size="sm" variant="outline">View / Edit Report</Button>
            </Link>
            {Object.entries(VIEW_LABELS).map(([mode, label]) => (
              <Link key={mode} href={`/dashboard/events/${id}/final-report?view=${mode}`}>
                <Button size="sm" variant={view === mode ? 'default' : 'outline'}>{label}</Button>
              </Link>
            ))}
            <GeneratePdfButton href={`/api/events/${id}/final-report-pdf`} />
          </div>
        </div>
      </div>

      <div className={`mx-auto space-y-6 p-6 ${printMode ? 'max-w-6xl' : 'max-w-7xl'}`}>

        {!printMode && (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 via-white to-emerald-50">
            <CardHeader>
              <CardTitle>Report Views</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {Object.entries(VIEW_LABELS).map(([mode, label]) => (
                <Link key={`body-${mode}`} href={`/dashboard/events/${id}/final-report?view=${mode}`}>
                  <Button size="sm" variant={view === mode ? 'default' : 'outline'}>{label}</Button>
                </Link>
              ))}
              <GeneratePdfButton href={`/api/events/${id}/final-report-pdf`} />
              <p className="text-sm text-gray-600">
                Use Comparison for leadership review, EPF for original proposal intent, ECR for actual field reporting, and Generate PDF for a proper executive export document.
              </p>
            </CardContent>
          </Card>
        )}

        <section className={`overflow-hidden rounded-3xl border border-gray-200 bg-white ${printMode ? 'report-print-shell' : 'shadow-sm'}`}>
          <div className={`grid gap-6 px-6 py-8 lg:grid-cols-[1.4fr_1fr] ${printMode ? 'bg-white text-slate-900 border-b border-slate-200' : 'bg-gradient-to-r from-slate-900 via-emerald-900 to-green-800 text-white'}`}>
            <div className="space-y-4">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${printMode ? 'bg-slate-100 text-slate-700' : 'bg-white/15 text-white/90'}`}>
                YGPT EVENT final report
              </div>
              <div>
                <h2 className="text-3xl font-semibold">{event.title}</h2>
                <p className={`mt-2 max-w-2xl text-sm ${printMode ? 'text-slate-600' : 'text-emerald-50/90'}`}>
                  This report compares the original event proposal with the actual execution outcome, helping leadership review delivery quality, participant reach, budget variance, and follow-up readiness in one place.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroStat icon={<MapPin className="h-4 w-4" />} label="Region" value={event.region} printMode={printMode} />
                <HeroStat icon={<CalendarDays className="h-4 w-4" />} label="Event Date" value={formatDate(event.event_date)} printMode={printMode} />
                <HeroStat icon={<Users className="h-4 w-4" />} label="Expected vs Actual" value={`${event.expected_attendees} / ${reportModel?.actualAttendees ?? 0}`} printMode={printMode} />
                <HeroStat icon={<IndianRupee className="h-4 w-4" />} label="Budget" value={`${formatCurrency(reportModel?.estimated ?? 0)} / ${formatCurrency(reportModel?.actual ?? 0)}`} printMode={printMode} />
              </div>
            </div>
            <div className={`grid gap-3 rounded-2xl p-5 text-sm ${printMode ? 'border border-slate-200 bg-slate-50' : 'border border-white/10 bg-white/10 backdrop-blur'}`}>
              <InsightRow title="Outcome direction" value={report.outcome_summary || 'Outcome summary not provided yet.'} printMode={printMode} />
              <InsightRow title="Budget variance" value={`${(reportModel?.variance ?? 0) > 0 ? 'Overspend' : (reportModel?.variance ?? 0) < 0 ? 'Savings' : 'On plan'} of ${formatCurrency(Math.abs(reportModel?.variance ?? 0))}`} printMode={printMode} />
              <InsightRow title="Attendance variance" value={`${(reportModel?.attendeeVariance ?? 0) >= 0 ? '+' : ''}${reportModel?.attendeeVariance ?? 0} compared with proposal`} printMode={printMode} />
              <InsightRow title="Venue used" value={report.actual_location || event.location} printMode={printMode} />
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            title="Planned Budget"
            value={formatCurrency(reportModel?.estimated ?? 0)}
            tone="green"
          />
          <MetricCard
            icon={<IndianRupee className="h-4 w-4" />}
            title="Actual Budget"
            value={formatCurrency(reportModel?.actual ?? 0)}
            tone="cyan"
          />
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            title="Participant Change"
            value={`${(reportModel?.attendeeVariance ?? 0) >= 0 ? '+' : ''}${reportModel?.attendeeVariance ?? 0}`}
            tone={(reportModel?.attendeeVariance ?? 0) >= 0 ? 'green' : 'amber'}
          />
          <MetricCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Donations / Support"
            value={formatCurrency(report.donations_received ?? 0)}
            tone="slate"
          />
        </div>

        <Card className="print:border-none print:shadow-none">
          <CardHeader>
            <CardTitle>Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {reportModel?.timelineSteps.map((step, index) => (
                <div key={step.label} className="relative rounded-2xl border border-gray-200 bg-white p-4">
                  {index < (reportModel?.timelineSteps.length ?? 0) - 1 && (
                    <div className="absolute right-[-18px] top-1/2 hidden h-px w-8 -translate-y-1/2 bg-gray-300 md:block" />
                  )}
                  <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full ${step.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {index + 1}
                  </div>
                  <p className="font-medium text-gray-900">{step.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{step.value}</p>
                </div>
              )) ?? null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle>What was planned, what happened, what changed</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <LayerCard
                title="What was planned"
                tone="slate"
                body={event.description || 'Proposal narrative not provided.'}
              />
              <LayerCard
                title="What happened"
                tone="green"
                body={report.execution_details || 'Execution details not provided.'}
              />
              <LayerCard
                title="What changed"
                tone="amber"
                body={reportModel?.changeSummary ?? 'No comparison summary available yet.'}
              />
            </CardContent>
          </Card>

          <Card className="print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle>Supporting Drive Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {reportModel?.driveLinks.map((link) => (
                <div key={link.label} className="rounded-xl border border-gray-200 p-3">
                  <p className="font-medium text-gray-900">{link.label}</p>
                  {link.url ? (
                    <a href={link.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-green-700 hover:underline">
                      <ExternalLink className="h-4 w-4" />
                      Open folder
                    </a>
                  ) : (
                    <p className="mt-2 text-gray-500">Drive routing not configured yet.</p>
                  )}
                </div>
              )) ?? null}
              {event.venue_gmaps_link && (
                <a href={event.venue_gmaps_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-700 hover:underline">
                  <MapPin className="h-4 w-4" />
                  Open venue map
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {(view === 'comparison' || printMode) && (
          <div className="space-y-6">
            <Card className="print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle>Proposal vs Execution Comparison</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <ComparisonRow label="Event Title" proposed={event.title} actual={event.title} />
                <ComparisonRow label="Goal" proposed={event.goal || 'Not specified'} actual={event.goal || 'Not specified'} />
                <ComparisonRow label="Date" proposed={formatDate(event.event_date)} actual={formatDate(event.event_date)} />
                <ComparisonRow label="Venue" proposed={event.location} actual={report.actual_location || event.location} />
                <ComparisonRow
                  label="Timings"
                  proposed={`${event.start_time || 'TBD'} - ${event.end_time || 'TBD'}`}
                  actual={`${report.actual_start_time || 'TBD'} - ${report.actual_end_time || 'TBD'}`}
                />
                <ComparisonRow
                  label="Participants"
                  proposed={String(event.expected_attendees)}
                  actual={String(report.actual_attendees ?? 0)}
                />
                <ComparisonRow
                  label="Proposal Intent"
                  proposed={event.description || 'Not provided'}
                  actual={report.outcome_summary || report.execution_details || 'Not provided'}
                  multiline
                />
                <ComparisonRow
                  label="Social / Reporting"
                  proposed={event.social_media_requirements || event.social_media_caption || 'Not provided'}
                  actual={report.social_media_writeup || 'Not provided'}
                  multiline
                />
              </CardContent>
            </Card>

            <Card className="print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle>Finance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium text-gray-500">Category</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Proposed</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Actual</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportModel?.budgets.map((line) => {
                        const lineVariance = Number(line.actual_amount || 0) - Number(line.estimated_amount || 0)
                        return (
                          <tr key={line.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-900">{line.category}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(line.estimated_amount)}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(line.actual_amount ?? 0)}</td>
                            <td className={`px-4 py-3 font-medium ${lineVariance > 0 ? 'text-red-600' : lineVariance < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                              {lineVariance > 0 ? '+' : ''}{formatCurrency(lineVariance)}
                            </td>
                          </tr>
                        )
                      }) ?? null}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <MiniStat title="Planned" value={formatCurrency(reportModel?.estimated ?? 0)} />
                  <MiniStat title="Actual" value={formatCurrency(reportModel?.actual ?? 0)} />
                  <MiniStat title="Variance" value={formatCurrency(reportModel?.variance ?? 0)} />
                  <MiniStat title="Donations" value={formatCurrency(report.donations_received ?? 0)} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <NarrativeBlock title="Budget Notes" value={report.budget_notes} />
                  <NarrativeBlock title="Donation Notes" value={report.donation_notes} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {(view === 'epf' || printMode) && (
          <Card className="print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle>Original EPF View</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <NarrativeBlock title="Goal / Purpose" value={event.description} />
              <NarrativeBlock title="Budget Justification" value={event.budget_justification} />
              <NarrativeBlock title="Participant Profile" value={event.participant_profile} />
              <NarrativeBlock title="Social Media Requirements" value={event.social_media_requirements} />
              <NarrativeBlock title="Suggested Caption" value={event.social_media_caption} />
            </CardContent>
          </Card>
        )}

        {(view === 'ecr' || printMode) && (
          <Card className="print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle>Submitted ECR View</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <NarrativeBlock title="Execution Details" value={report.execution_details} />
              <NarrativeBlock title="Outcome Summary" value={report.outcome_summary} />
              <NarrativeBlock title="Challenges" value={report.challenges} />
              <NarrativeBlock title="Lessons Learned" value={report.lessons_learned} />
              <NarrativeBlock title="Social Media Writeup" value={report.social_media_writeup} />
              <NarrativeBlock title="Follow-Up Actions" value={report.follow_up_actions} />
              <NarrativeBlock title="Auto Summary" value={report.auto_summary} mono />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function HeroStat({
  icon,
  label,
  value,
  printMode = false,
}: {
  icon: ReactNode
  label: string
  value: string
  printMode?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 ${printMode ? 'border border-slate-200 bg-white' : 'border border-white/10 bg-white/10 backdrop-blur'}`}>
      <div className={`mb-2 inline-flex items-center gap-2 ${printMode ? 'text-slate-500' : 'text-emerald-50/90'}`}>
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${printMode ? 'text-slate-900' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function InsightRow({ title, value, printMode = false }: { title: string; value: string; printMode?: boolean }) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-wide ${printMode ? 'text-slate-500' : 'text-emerald-100/80'}`}>{title}</p>
      <p className={`mt-1 text-sm ${printMode ? 'text-slate-900' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function MetricCard({
  icon,
  title,
  value,
  tone,
}: {
  icon: ReactNode
  title: string
  value: string
  tone: 'green' | 'cyan' | 'amber' | 'slate'
}) {
  const toneMap = {
    green: 'border-green-200 bg-green-50 text-green-900',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-gray-200 bg-gray-50 text-gray-900',
  }

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function LayerCard({
  title,
  body,
  tone,
}: {
  title: string
  body: string
  tone: 'slate' | 'green' | 'amber'
}) {
  const toneMap = {
    slate: 'border-gray-200 bg-gray-50',
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
  }

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{body}</p>
    </div>
  )
}

function ComparisonRow({
  label,
  proposed,
  actual,
  multiline = false,
}: {
  label: string
  proposed: string
  actual: string
  multiline?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Planned</p>
          <p className={`text-sm text-gray-700 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{proposed}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Actual</p>
          <p className={`text-sm text-gray-700 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{actual}</p>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function NarrativeBlock({
  title,
  value,
  mono = false,
}: {
  title: string
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700 ${mono ? 'rounded-xl bg-gray-50 p-3 font-mono text-xs' : ''}`}>
        {value}
      </p>
    </div>
  )
}
