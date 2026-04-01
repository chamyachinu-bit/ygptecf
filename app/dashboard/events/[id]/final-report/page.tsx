import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Budget, EventFile, EventReport } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FinalReportPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('*, budgets(*), files(*), event_reports(*)')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const report = (event.event_reports?.[0] ?? null) as EventReport | null
  if (!report) redirect(`/dashboard/events/${id}`)

  const reportFiles = ((event.files ?? []) as EventFile[]).filter((file) => file.file_type === 'report_image')
  const invoiceFiles = ((event.files ?? []) as EventFile[]).filter((file) => file.file_type === 'invoice_document')
  const budgets = (event.budgets ?? []) as Budget[]
  const estimated = budgets.reduce((sum, line) => sum + Number(line.estimated_amount || 0), 0)
  const actual = budgets.reduce((sum, line) => sum + Number(line.actual_amount || 0), 0)

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/events/${id}`}>
            <button className="p-1.5 rounded hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Final Event Completion Report</h1>
            <p className="text-xs text-gray-500">{event.event_code} · {event.title}</p>
          </div>
        </div>
        <Button variant="outline" disabled className="opacity-70">Printable View Ready</Button>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <SummaryItem label="Region" value={event.region} />
            <SummaryItem label="Event Date" value={formatDate(event.event_date)} />
            <SummaryItem label="Planned Budget" value={formatCurrency(estimated)} />
            <SummaryItem label="Actual Budget" value={formatCurrency(actual)} />
            <SummaryItem label="Expected Participants" value={String(event.expected_attendees)} />
            <SummaryItem label="Actual Participants" value={String(report.actual_attendees ?? 0)} />
            <SummaryItem label="Donations" value={formatCurrency(report.donations_received ?? 0)} />
            <SummaryItem label="Venue" value={report.actual_location || event.location} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Event Execution</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Section label="Execution Details" value={report.execution_details} />
              <Section label="Outcome Summary" value={report.outcome_summary} />
              <Section label="Challenges" value={report.challenges} />
              <Section label="Lessons Learned" value={report.lessons_learned} />
              <Section label="Follow-Up Actions" value={report.follow_up_actions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Budget and Reporting</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {budgets.map((line) => (
                  <div key={line.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm">
                    <div>
                      <p className="font-medium">{line.category}</p>
                      {line.description && <p className="text-gray-500">{line.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(line.estimated_amount)}</p>
                      <p className="text-cyan-700 text-xs">Actual: {formatCurrency(line.actual_amount ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Section label="Budget Notes" value={report.budget_notes} />
              <Section label="Donation Notes" value={report.donation_notes} />
              <Section label="Social Media Writeup" value={report.social_media_writeup} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Report Assets</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {reportFiles.length === 0 ? (
                <p className="text-gray-500">No report assets uploaded.</p>
              ) : (
                reportFiles.map((file) => (
                  <p key={file.id} className="rounded-md border border-gray-200 p-3">{file.file_name}</p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Invoices and Finance Files</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {invoiceFiles.length === 0 ? (
                <p className="text-gray-500">No invoice documents uploaded.</p>
              ) : (
                invoiceFiles.map((file) => (
                  <p key={file.id} className="rounded-md border border-gray-200 p-3">{file.file_name}</p>
                ))
              )}
              {event.venue_gmaps_link && (
                <a href={event.venue_gmaps_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-700 hover:underline">
                  <ExternalLink className="w-4 h-4" />
                  Open venue map
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function Section({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
