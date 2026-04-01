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
import { PrintReportButton } from '@/components/reports/PrintReportButton'
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

  const report = (reportData ?? null) as EventReport | null
  const budgets = (event.budgets ?? []) as Budget[]
  const estimated = budgets.reduce((sum, line) => sum + Number(line.estimated_amount || 0), 0)
  const actual = budgets.reduce((sum, line) => sum + Number(line.actual_amount || 0), 0)
  const variance = actual - estimated
  const actualAttendees = report?.actual_attendees ?? 0
  const attendeeVariance = actualAttendees - Number(event.expected_attendees || 0)
  const timingVariance =
    report?.actual_start_time && event.start_time && report.actual_start_time !== event.start_time
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
    { label: 'Report Ready', value: report?.created_at ? formatDate(report.created_at) : 'Pending', done: !!report },
  ]

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
    <div className={printMode ? 'print:bg-white' : ''}>
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
            <PrintReportButton href={`/dashboard/events/${id}/final-report?view=${view}&print=1`} />
          </div>
        </div>
      </div>

      <div className={`mx-auto space-y-6 p-6 ${printMode ? 'max-w-6xl' : 'max-w-7xl'}`}>
        {printMode && (
          <div className="print:hidden flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              Print layout loaded. Your browser print dialog should open automatically. If it does not, use the button here.
            </p>
            <PrintReportButton autoPrint label="Print Now" />
          </div>
        )}

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
              <PrintReportButton href={`/dashboard/events/${id}/final-report?view=${view}&print=1`} />
              <p className="text-sm text-gray-600">
                Use Comparison for leadership review, EPF for original proposal intent, ECR for actual field reporting, and Print / PDF for a cleaner export-ready layout.
              </p>
            </CardContent>
          </Card>
        )}

        <section className={`overflow-hidden rounded-3xl border border-gray-200 bg-white ${printMode ? '' : 'shadow-sm'}`}>
          <div className="grid gap-6 bg-gradient-to-r from-slate-900 via-emerald-900 to-green-800 px-6 py-8 text-white lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/90">
                YGPT EVENT final report
              </div>
              <div>
                <h2 className="text-3xl font-semibold">{event.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">
                  This report compares the original event proposal with the actual execution outcome, helping leadership review delivery quality, participant reach, budget variance, and follow-up readiness in one place.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroStat icon={<MapPin className="h-4 w-4" />} label="Region" value={event.region} />
                <HeroStat icon={<CalendarDays className="h-4 w-4" />} label="Event Date" value={formatDate(event.event_date)} />
                <HeroStat icon={<Users className="h-4 w-4" />} label="Expected vs Actual" value={`${event.expected_attendees} / ${actualAttendees}`} />
                <HeroStat icon={<IndianRupee className="h-4 w-4" />} label="Budget" value={`${formatCurrency(estimated)} / ${formatCurrency(actual)}`} />
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-5 text-sm backdrop-blur">
              <InsightRow title="Outcome direction" value={report.outcome_summary || 'Outcome summary not provided yet.'} />
              <InsightRow title="Budget variance" value={`${variance > 0 ? 'Overspend' : variance < 0 ? 'Savings' : 'On plan'} of ${formatCurrency(Math.abs(variance))}`} />
              <InsightRow title="Attendance variance" value={`${attendeeVariance >= 0 ? '+' : ''}${attendeeVariance} compared with proposal`} />
              <InsightRow title="Venue used" value={report.actual_location || event.location} />
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            title="Planned Budget"
            value={formatCurrency(estimated)}
            tone="green"
          />
          <MetricCard
            icon={<IndianRupee className="h-4 w-4" />}
            title="Actual Budget"
            value={formatCurrency(actual)}
            tone="cyan"
          />
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            title="Participant Change"
            value={`${attendeeVariance >= 0 ? '+' : ''}${attendeeVariance}`}
            tone={attendeeVariance >= 0 ? 'green' : 'amber'}
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
              {timelineSteps.map((step, index) => (
                <div key={step.label} className="relative rounded-2xl border border-gray-200 bg-white p-4">
                  {index < timelineSteps.length - 1 && (
                    <div className="absolute right-[-18px] top-1/2 hidden h-px w-8 -translate-y-1/2 bg-gray-300 md:block" />
                  )}
                  <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full ${step.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {index + 1}
                  </div>
                  <p className="font-medium text-gray-900">{step.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{step.value}</p>
                </div>
              ))}
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
                body={buildChangeSummary(event, report, attendeeVariance, variance, timingVariance)}
              />
            </CardContent>
          </Card>

          <Card className="print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle>Supporting Drive Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {driveLinks.map((link) => (
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
              ))}
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
                      {budgets.map((line) => {
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
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <MiniStat title="Planned" value={formatCurrency(estimated)} />
                  <MiniStat title="Actual" value={formatCurrency(actual)} />
                  <MiniStat title="Variance" value={formatCurrency(variance)} />
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

function buildChangeSummary(
  event: { location: string; expected_attendees: number; start_time?: string | null },
  report: EventReport,
  attendeeVariance: number,
  budgetVariance: number,
  timingVariance: string | null
) {
  const changes = [
    attendeeVariance !== 0
      ? `Attendance changed by ${attendeeVariance >= 0 ? '+' : ''}${attendeeVariance} compared with the proposal.`
      : 'Attendance matched the proposal target closely.',
    budgetVariance !== 0
      ? `Budget variance was ${budgetVariance > 0 ? 'an overspend' : 'a saving'} of ${formatCurrency(Math.abs(budgetVariance))}.`
      : 'Budget tracked exactly to plan.',
    report.actual_location && report.actual_location !== event.location
      ? `The actual venue changed from the proposal location.`
      : 'The event was held at the planned location.',
    timingVariance ? `Timing changed: ${timingVariance}.` : 'Timing stayed aligned with the proposal.',
  ]

  return changes.join(' ')
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="mb-2 inline-flex items-center gap-2 text-emerald-50/90">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function InsightRow({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-emerald-100/80">{title}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
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
