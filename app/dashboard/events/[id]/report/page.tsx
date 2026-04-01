'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Flag,
  IndianRupee,
  MapPin,
  Target,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BudgetLineItems, type BudgetLine } from '@/components/events/BudgetLineItems'
import { DriveFoldersPanel } from '@/components/events/DriveFoldersPanel'
import { GeneratePdfButton } from '@/components/reports/PrintReportButton'
import type { Event, EventReport } from '@/types/database'

type ReportFormState = {
  actual_attendees: string
  execution_details: string
  outcome_summary: string
  challenges: string
  lessons_learned: string
  budget_notes: string
  donations_received: string
  donation_notes: string
  actual_start_time: string
  actual_end_time: string
  actual_location: string
  social_media_writeup: string
  follow_up_actions: string
}

const EMPTY_FORM: ReportFormState = {
  actual_attendees: '',
  execution_details: '',
  outcome_summary: '',
  challenges: '',
  lessons_learned: '',
  budget_notes: '',
  donations_received: '',
  donation_notes: '',
  actual_start_time: '',
  actual_end_time: '',
  actual_location: '',
  social_media_writeup: '',
  follow_up_actions: '',
}

const SECTION_LINKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'execution', label: 'Execution' },
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'budget', label: 'Budget and Donations' },
  { id: 'media', label: 'Media and Follow-up' },
]

export default function ReportPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [event, setEvent] = useState<Event | null>(null)
  const [existingReport, setExistingReport] = useState<EventReport | null>(null)
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<ReportFormState>(EMPTY_FORM)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const [{ data: eventData }, { data: savedReport }] = await Promise.all([
        supabase.from('events').select('*, budgets(*)').eq('id', id).single(),
        supabase
          .from('event_reports')
          .select('*')
          .eq('event_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (!eventData) return

      setEvent(eventData)
      setExistingReport(savedReport ?? null)
      setBudgetLines(
        (eventData.budgets ?? []).map((line: BudgetLine) => ({
          id: line.id,
          category: line.category,
          description: line.description,
          justification: line.justification,
          estimated_amount: Number(line.estimated_amount) || 0,
          actual_amount: line.actual_amount ?? null,
        }))
      )
      setForm({
        actual_attendees: savedReport?.actual_attendees?.toString() || '',
        execution_details: savedReport?.execution_details || '',
        outcome_summary: savedReport?.outcome_summary || '',
        challenges: savedReport?.challenges || '',
        lessons_learned: savedReport?.lessons_learned || '',
        budget_notes: savedReport?.budget_notes || '',
        donations_received: savedReport?.donations_received?.toString() || '',
        donation_notes: savedReport?.donation_notes || '',
        actual_start_time: savedReport?.actual_start_time || '',
        actual_end_time: savedReport?.actual_end_time || '',
        actual_location: savedReport?.actual_location || eventData.location || '',
        social_media_writeup: savedReport?.social_media_writeup || '',
        follow_up_actions: savedReport?.follow_up_actions || '',
      })
    }

    load()
  }, [id, supabase])

  const estimatedTotal = useMemo(
    () => budgetLines.reduce((sum, line) => sum + (Number(line.estimated_amount) || 0), 0),
    [budgetLines]
  )

  const actualTotal = useMemo(
    () => budgetLines.reduce((sum, line) => sum + (Number(line.actual_amount) || 0), 0),
    [budgetLines]
  )

  const varianceTotal = actualTotal - estimatedTotal

  const handleAutofill = () => {
    if (!event) return
    const now = new Date()
    const actualAttendees = Math.max(25, event.expected_attendees - ((now.getMinutes() % 12) + 3))

    setForm({
      actual_attendees: String(actualAttendees),
      execution_details:
        'The event opened with welcome remarks, followed by focused sessions, group activities, and a structured close-out. Attendance remained stable and participants stayed engaged across the day.',
      outcome_summary:
        'Participants completed the planned activities, generated practical action ideas, and responded positively to the event format and coordination.',
      challenges:
        'Registration and AV setup caused a short delay at the start, but the team quickly recovered the flow.',
      lessons_learned:
        'Technical setup should begin earlier, and a separate registration volunteer should be assigned before the event opens.',
      budget_notes:
        'Refreshments came in slightly below estimate while printed material required a few extra copies.',
      donations_received: String(1000 + (now.getSeconds() % 5) * 250),
      donation_notes: 'Local partner contributed cash support and some in-kind refreshments.',
      actual_start_time: '10:15',
      actual_end_time: '15:45',
      actual_location: event.location,
      social_media_writeup:
        'Published a same-day event summary with participant photos, key takeaways, and a short impact-oriented caption.',
      follow_up_actions:
        'Share summary notes with stakeholders, schedule a follow-up review, and track participant action commitments.',
    })

    setBudgetLines((current) =>
      current.map((line, index) => ({
        ...line,
        actual_amount: Math.max(0, Number(line.estimated_amount) - (index % 2 === 0 ? 0 : 100) + (index === 2 ? 150 : 0)),
      }))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!userId) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const reportPayload = {
      event_id: id,
      submitted_by: userId,
      actual_attendees: parseInt(form.actual_attendees, 10) || null,
      execution_details: form.execution_details || null,
      outcome_summary: form.outcome_summary || null,
      challenges: form.challenges || null,
      lessons_learned: form.lessons_learned || null,
      budget_notes: form.budget_notes || null,
      donations_received: Number(form.donations_received) || 0,
      donation_notes: form.donation_notes || null,
      actual_start_time: form.actual_start_time || null,
      actual_end_time: form.actual_end_time || null,
      actual_location: form.actual_location || null,
      social_media_writeup: form.social_media_writeup || null,
      follow_up_actions: form.follow_up_actions || null,
    }

    const { error: reportError } = existingReport
      ? await supabase.from('event_reports').update(reportPayload).eq('id', existingReport.id)
      : await supabase.from('event_reports').insert(reportPayload)

    if (reportError) {
      setError(reportError.message)
      setLoading(false)
      return
    }

    const updatedBudgetLines = budgetLines.filter((line) => line.id)
    if (updatedBudgetLines.length > 0) {
      const budgetUpdates = await Promise.all(
        updatedBudgetLines.map((line) =>
          supabase
            .from('budgets')
            .update({ actual_amount: Number(line.actual_amount) || 0 })
            .eq('id', line.id!)
        )
      )

      const failedUpdate = budgetUpdates.find((result) => result.error)
      if (failedUpdate?.error) {
        setError(failedUpdate.error.message)
        setLoading(false)
        return
      }
    }

    fetch('/api/events/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: id }),
    }).catch(() => {})

    router.push(`/dashboard/events/${id}/final-report`)
    router.refresh()
  }

  if (!event) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/events/${id}`}>
              <button className="rounded p-1.5 hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Event Completion Report</h1>
              <p className="text-sm text-gray-500">{event.event_code} - {event.title}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {existingReport && (
              <Link href={`/dashboard/events/${id}/final-report`}>
                <Button type="button" variant="outline">Open Final Report</Button>
              </Link>
            )}
            {existingReport && (
              <GeneratePdfButton href={`/api/events/${id}/final-report-pdf`} />
            )}
            <Button type="button" variant="outline" onClick={handleAutofill}>
              Autofill Test Data
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-green-200 bg-gradient-to-r from-green-50 via-white to-emerald-50">
            <CardHeader>
              <CardTitle>ECR Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Capture the actual execution of the event, document changes from the original proposal, and prepare a clean final report for leadership, Finance, and Accounts.
              </p>
              <div className="flex flex-wrap gap-2">
                {SECTION_LINKS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="rounded-full border border-green-200 bg-white px-3 py-1 text-sm font-medium text-green-800 hover:bg-green-100"
                  >
                    {section.label}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section id="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <FieldShell label="Actual Participants" helper="Compare this with the original expected count.">
                    <Input
                      type="number"
                      min="0"
                      placeholder={`Expected: ${event.expected_attendees}`}
                      value={form.actual_attendees}
                      onChange={(e) => setForm({ ...form, actual_attendees: e.target.value })}
                      required
                    />
                  </FieldShell>
                  <FieldShell label="Actual Start Time" helper="Use the real on-ground start time.">
                    <Input
                      type="time"
                      value={form.actual_start_time}
                      onChange={(e) => setForm({ ...form, actual_start_time: e.target.value })}
                    />
                  </FieldShell>
                  <FieldShell label="Actual End Time" helper="Use the real closing time.">
                    <Input
                      type="time"
                      value={form.actual_end_time}
                      onChange={(e) => setForm({ ...form, actual_end_time: e.target.value })}
                    />
                  </FieldShell>
                  <div className="md:col-span-3">
                    <FieldShell label="Actual Venue / Location" helper="Record the final execution venue, especially if it changed from the proposal.">
                      <Input
                        value={form.actual_location}
                        onChange={(e) => setForm({ ...form, actual_location: e.target.value })}
                      />
                    </FieldShell>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="execution">
              <Card>
                <CardHeader>
                  <CardTitle>Execution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldShell label="Execution Details" helper="Describe what happened during the event, how the plan unfolded, and how the day was run.">
                    <Textarea
                      placeholder="Document agenda delivery, coordination, attendance quality, and operational flow."
                      rows={5}
                      value={form.execution_details}
                      onChange={(e) => setForm({ ...form, execution_details: e.target.value })}
                      required
                    />
                  </FieldShell>
                </CardContent>
              </Card>
            </section>

            <section id="outcomes">
              <Card>
                <CardHeader>
                  <CardTitle>Outcomes and Learning</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldShell label="Outcome Summary" helper="Summarize what the event achieved in practical terms.">
                    <Textarea
                      placeholder="Describe the event outcomes, engagement, and visible impact."
                      rows={4}
                      value={form.outcome_summary}
                      onChange={(e) => setForm({ ...form, outcome_summary: e.target.value })}
                      required
                    />
                  </FieldShell>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Issues / Challenges" helper="Mention operational issues, delays, or constraints that affected delivery.">
                      <Textarea
                        placeholder="What changed, went wrong, or needs follow-up?"
                        rows={4}
                        value={form.challenges}
                        onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                      />
                    </FieldShell>
                    <FieldShell label="Lessons Learned" helper="Capture what should be improved or repeated next time.">
                      <Textarea
                        placeholder="What would you keep or improve in future events?"
                        rows={4}
                        value={form.lessons_learned}
                        onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })}
                      />
                    </FieldShell>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="budget">
              <Card>
                <CardHeader>
                  <CardTitle>Budget and Donations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      title="Planned Budget"
                      value={`Rs ${estimatedTotal.toLocaleString('en-IN')}`}
                      tone="green"
                    />
                    <MetricCard
                      title="Actual Spend"
                      value={`Rs ${actualTotal.toLocaleString('en-IN')}`}
                      tone="cyan"
                    />
                    <MetricCard
                      title="Variance"
                      value={`${varianceTotal > 0 ? '+' : ''}Rs ${varianceTotal.toLocaleString('en-IN')}`}
                      tone={varianceTotal > 0 ? 'red' : varianceTotal < 0 ? 'green' : 'slate'}
                    />
                  </div>

                  {budgetLines.length > 0 ? (
                    <BudgetLineItems items={budgetLines} onChange={setBudgetLines} showActual />
                  ) : (
                    <p className="text-sm text-gray-500">No budget lines were submitted on the EPF.</p>
                  )}

                  {budgetLines.length > 0 && (
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
                          {budgetLines.map((line, index) => {
                            const proposed = Number(line.estimated_amount) || 0
                            const actual = Number(line.actual_amount) || 0
                            const variance = actual - proposed
                            return (
                              <tr key={`${line.category}-${index}`} className="border-t border-gray-100">
                                <td className="px-4 py-3 font-medium text-gray-900">{line.category}</td>
                                <td className="px-4 py-3 text-gray-700">Rs {proposed.toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3 text-gray-700">Rs {actual.toLocaleString('en-IN')}</td>
                                <td className={`px-4 py-3 font-medium ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                                  {variance > 0 ? '+' : ''}Rs {variance.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Donations / Contributions Received" helper="Include cash and in-kind support when relevant.">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.donations_received}
                        onChange={(e) => setForm({ ...form, donations_received: e.target.value })}
                      />
                    </FieldShell>
                    <FieldShell label="Donation Notes" helper="Mention sponsors, local partners, or in-kind support details.">
                      <Textarea
                        placeholder="Record donation context and support details."
                        rows={3}
                        value={form.donation_notes}
                        onChange={(e) => setForm({ ...form, donation_notes: e.target.value })}
                      />
                    </FieldShell>
                  </div>

                  <FieldShell label="Budget Notes" helper="Explain why the actual spend changed from the EPF budget, if it did.">
                    <Textarea
                      placeholder="Explain variance, reimbursements, savings, or overspend drivers."
                      rows={4}
                      value={form.budget_notes}
                      onChange={(e) => setForm({ ...form, budget_notes: e.target.value })}
                    />
                  </FieldShell>
                </CardContent>
              </Card>
            </section>

            <section id="media">
              <Card>
                <CardHeader>
                  <CardTitle>Media and Follow-up</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldShell label="Social Media Writeup" helper="Paste the final summary, caption, or public-facing message used after the event.">
                    <Textarea
                      placeholder="Write the final social summary, caption, or post-ready recap."
                      rows={4}
                      value={form.social_media_writeup}
                      onChange={(e) => setForm({ ...form, social_media_writeup: e.target.value })}
                    />
                  </FieldShell>
                  <FieldShell label="Follow-Up Actions" helper="Document promised next steps, referrals, or future actions.">
                    <Textarea
                      placeholder="Record follow-up meetings, commitments, referrals, and next actions."
                      rows={4}
                      value={form.follow_up_actions}
                      onChange={(e) => setForm({ ...form, follow_up_actions: e.target.value })}
                    />
                  </FieldShell>

                  <DriveFoldersPanel
                    eventId={id}
                    title="Drive Report Workspace"
                    description="Use Drive folders for media, report evidence, and invoice documents. The app stores the workflow metadata while Drive holds the supporting files."
                    folders={[
                      { key: 'media', label: 'Media Folder', description: 'Store photos, videos, and communication assets here.', url: event.media_drive_url },
                      { key: 'report', label: 'Report Folder', description: 'Store final report evidence and supporting files here.', url: event.report_drive_url },
                      { key: 'invoice', label: 'Invoice Folder', description: 'Store invoices, bills, and receipts here.', url: event.invoice_drive_url },
                    ]}
                    syncStatus={event.drive_sync_status}
                    syncMessage={event.drive_sync_message}
                    canRefresh={event.created_by === userId}
                  />
                </CardContent>
              </Card>
            </section>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-600">
                {existingReport
                  ? 'Updating this report will refresh the final report layout and keep your previous data editable.'
                  : 'Submitting this report will create the final report view automatically.'}
              </p>
              <div className="flex gap-2">
                {existingReport && (
                  <Link href={`/dashboard/events/${id}/final-report`}>
                    <Button type="button" variant="outline">Open Final Report</Button>
                  </Link>
                )}
                {existingReport && (
                  <GeneratePdfButton href={`/api/events/${id}/final-report-pdf`} />
                )}
                <Button type="submit" loading={loading}>
                  {existingReport ? 'Update Event Completion Report' : 'Submit Event Completion Report'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Report Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <SummaryRow icon={<FileText className="h-4 w-4" />} label="Event Code" value={event.event_code} />
              <SummaryRow icon={<Target className="h-4 w-4" />} label="Goal" value={event.goal || 'General event'} />
              <SummaryRow icon={<CalendarDays className="h-4 w-4" />} label="Date" value={event.event_date} />
              <SummaryRow icon={<MapPin className="h-4 w-4" />} label="Region" value={event.region} />
              <SummaryRow icon={<Users className="h-4 w-4" />} label="Expected" value={String(event.expected_attendees)} />
              <SummaryRow icon={<Users className="h-4 w-4" />} label="Actual" value={form.actual_attendees || 'Not entered'} />
              <SummaryRow icon={<IndianRupee className="h-4 w-4" />} label="Planned Budget" value={`Rs ${estimatedTotal.toLocaleString('en-IN')}`} />
              <SummaryRow icon={<IndianRupee className="h-4 w-4" />} label="Actual Spend" value={`Rs ${actualTotal.toLocaleString('en-IN')}`} />
              <SummaryRow icon={<Clock3 className="h-4 w-4" />} label="Time Window" value={`${form.actual_start_time || 'TBD'} - ${form.actual_end_time || 'TBD'}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Editing Guidance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>Use actual execution details rather than repeating proposal wording.</p>
              <p>Highlight what changed, what worked, and what should improve next time.</p>
              <p>Finance and Accounts will compare this report with the original EPF and budget lines.</p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <div className="flex items-start gap-2">
                  <Flag className="mt-0.5 h-4 w-4" />
                  <p>
                    This editor should always preload your last saved report. If values are missing after refresh, the direct report lookup is the part to inspect.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function FieldShell({
  label,
  helper,
  children,
}: {
  label: string
  helper: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      <p className="text-xs text-gray-500">{helper}</p>
    </div>
  )
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: 'green' | 'cyan' | 'red' | 'slate'
}) {
  const toneMap = {
    green: 'border-green-200 bg-green-50 text-green-800',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    slate: 'border-gray-200 bg-gray-50 text-gray-800',
  }

  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <p className="text-xs uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}
