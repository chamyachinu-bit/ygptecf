import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, LineChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

  const [{ data: profileData }, { data: eventData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('events').select('*, budgets(*), event_reports(*)').eq('id', id).single(),
  ])

  const profile = profileData as Profile | null
  const event = eventData

  if (!event || !profile) notFound()

  const report = (event.event_reports?.[0] ?? null) as EventReport | null
  if (!report) redirect(`/dashboard/events/${id}`)

  const budgets = (event.budgets ?? []) as Budget[]
  const estimated = budgets.reduce((sum, line) => sum + Number(line.estimated_amount || 0), 0)
  const actual = budgets.reduce((sum, line) => sum + Number(line.actual_amount || 0), 0)

  const driveLinks = [
    { label: 'Proposal Folder', url: event.proposal_drive_url },
    { label: 'Media Folder', url: event.media_drive_url },
    { label: 'Report Folder', url: event.report_drive_url },
    { label: 'Invoice Folder', url: event.invoice_drive_url },
  ]

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/events/${id}`}>
              <button className="rounded p-1.5 hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Final Event Completion Report</h1>
              <p className="text-xs text-gray-500">{event.event_code} · {event.title}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!printMode && (
              <>
                {Object.entries(VIEW_LABELS).map(([mode, label]) => (
                  <Link key={mode} href={`/dashboard/events/${id}/final-report?view=${mode}`}>
                    <Button size="sm" variant={view === mode ? 'default' : 'outline'}>{label}</Button>
                  </Link>
                ))}
                <Link href={`/dashboard/events/${id}/final-report?view=${view}&print=1`}>
                  <Button size="sm" variant="outline">Printable Layout</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`mx-auto space-y-6 p-6 ${printMode ? 'max-w-6xl' : 'max-w-5xl'}`}>
        {!printMode && (
          <Card className="border-green-200 bg-green-50/60">
            <CardHeader>
              <CardTitle>Report Views</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {Object.entries(VIEW_LABELS).map(([mode, label]) => (
                <Link key={`body-${mode}`} href={`/dashboard/events/${id}/final-report?view=${mode}`}>
                  <Button size="sm" variant={view === mode ? 'default' : 'outline'}>{label}</Button>
                </Link>
              ))}
              <Link href={`/dashboard/events/${id}/final-report?view=${view}&print=1`}>
                <Button size="sm" variant="outline">Printable Layout</Button>
              </Link>
              <p className="text-sm text-gray-600">
                Switch between the comparison view, original EPF, submitted ECR, or the printable combined layout.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <SummaryItem label="Region" value={event.region} />
            <SummaryItem label="Event Date" value={formatDate(event.event_date)} />
            <SummaryItem label="Planned Budget" value={formatCurrency(estimated)} />
            <SummaryItem label="Actual Budget" value={formatCurrency(actual)} />
            <SummaryItem label="Expected Participants" value={String(event.expected_attendees)} />
            <SummaryItem label="Actual Participants" value={String(report.actual_attendees ?? 0)} />
            <SummaryItem label="Donations / Support" value={formatCurrency(report.donations_received ?? 0)} />
            <SummaryItem label="Final Venue" value={report.actual_location || event.location} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Merged Narrative Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <Section label="Proposal Intent" value={event.description} />
              <Section label="Execution Details" value={report.execution_details} />
              <Section label="Outcome Summary" value={report.outcome_summary} />
              <Section label="Challenges" value={report.challenges} />
              <Section label="Lessons Learned" value={report.lessons_learned} />
              <Section label="Follow-Up Actions" value={report.follow_up_actions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drive Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {driveLinks.map((link) => (
                <div key={link.label} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-medium text-gray-900">{link.label}</p>
                  {link.url ? (
                    <a href={link.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-green-700 hover:underline">
                      <ExternalLink className="h-4 w-4" />
                      Open Folder
                    </a>
                  ) : (
                    <p className="mt-2 text-gray-500">Drive routing not configured yet.</p>
                  )}
                </div>
              ))}
              {event.venue_gmaps_link && (
                <a href={event.venue_gmaps_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-700 hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  Open Venue Map
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {(view === 'comparison' || printMode) && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-green-700" />
                  EPF vs ECR Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ComparisonRow label="Event Title" proposed={event.title} actual={event.title} />
                <ComparisonRow label="Goal" proposed={event.goal || 'Not specified'} actual={event.goal || 'Not specified'} />
                <ComparisonRow label="Date" proposed={formatDate(event.event_date)} actual={formatDate(event.event_date)} />
                <ComparisonRow label="Venue" proposed={event.location} actual={report.actual_location || event.location} />
                <ComparisonRow label="Timings" proposed={`${event.start_time || 'TBD'} - ${event.end_time || 'TBD'}`} actual={`${report.actual_start_time || 'TBD'} - ${report.actual_end_time || 'TBD'}`} />
                <ComparisonRow label="Participants" proposed={String(event.expected_attendees)} actual={String(report.actual_attendees ?? 0)} />
                <ComparisonRow label="Proposal Intent" proposed={event.description || 'Not provided'} actual={report.outcome_summary || report.execution_details || 'Not provided'} multiline />
                <ComparisonRow label="Social / Reporting" proposed={event.social_media_requirements || event.social_media_caption || 'Not provided'} actual={report.social_media_writeup || 'Not provided'} multiline />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Finance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        const variance = Number(line.actual_amount || 0) - Number(line.estimated_amount || 0)
                        return (
                          <tr key={line.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-900">{line.category}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(line.estimated_amount)}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(line.actual_amount ?? 0)}</td>
                            <td className={`px-4 py-3 font-medium ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                              {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <SummaryItem label="Planned Budget" value={formatCurrency(estimated)} />
                  <SummaryItem label="Actual Budget" value={formatCurrency(actual)} />
                  <SummaryItem label="Variance" value={formatCurrency(actual - estimated)} />
                  <SummaryItem label="Donations / Support" value={formatCurrency(report.donations_received ?? 0)} />
                </div>
                <Section label="Budget Notes" value={report.budget_notes} />
                <Section label="Donation Notes" value={report.donation_notes} />
              </CardContent>
            </Card>
          </div>
        )}

        {(view === 'epf' || printMode) && (
          <Card>
            <CardHeader>
              <CardTitle>Original EPF View</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <Section label="Goal / Purpose" value={event.description} />
              <Section label="Budget Justification" value={event.budget_justification} />
              <Section label="Participant Profile" value={event.participant_profile} />
              <Section label="Social Media Requirements" value={event.social_media_requirements} />
              <Section label="Suggested Caption" value={event.social_media_caption} />
            </CardContent>
          </Card>
        )}

        {(view === 'ecr' || printMode) && (
          <Card>
            <CardHeader>
              <CardTitle>Submitted ECR View</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <Section label="Execution Details" value={report.execution_details} />
              <Section label="Outcome Summary" value={report.outcome_summary} />
              <Section label="Challenges" value={report.challenges} />
              <Section label="Lessons Learned" value={report.lessons_learned} />
              <Section label="Social Media Writeup" value={report.social_media_writeup} />
              <Section label="Follow-Up Actions" value={report.follow_up_actions} />
              <Section label="Auto Summary" value={report.auto_summary} mono />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function Section({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`whitespace-pre-wrap text-sm text-gray-700 ${mono ? 'rounded-md bg-gray-50 p-3 font-mono text-xs' : ''}`}>
        {value}
      </p>
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
    <div className="rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Proposed</p>
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
