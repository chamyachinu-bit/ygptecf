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
  const [demoAutofillEnabled, setDemoAutofillEnabled] = useState(false)
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
      const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').single()
      if (profileData?.role === 'designer') {
        router.replace('/dashboard/flyer-requests')
        return
      }
      if (profileData?.role === 'social_media_team') {
        router.replace('/dashboard/social-workflow')
        return
      }

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

      try {
        const res = await fetch('/api/app/autofill-settings', { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as { enabled?: boolean }
          setDemoAutofillEnabled(Boolean(data.enabled))
        }
      } catch {
        setDemoAutofillEnabled(false)
      }
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
    const attendanceShare = Math.round((actualAttendees / Math.max(event.expected_attendees, 1)) * 100)

    setForm({
      actual_attendees: String(actualAttendees),
      execution_details:
        'The event opened with registration, a short welcome, and a structured agenda covering the planned sessions, breakout participation, practical discussion rounds, and a coordinated close-out. Volunteer coordination improved the session flow and participant engagement remained strong across the day.',
      outcome_summary:
        `Participants completed the planned activities, contributed actively during discussion rounds, and generated practical next steps for local follow-up. Attendance reached about ${attendanceShare}% of the original projection, and the response to the format and facilitation remained positive.`,
      challenges:
        'Registration ran slightly slower than expected at the start and the AV setup required extra coordination, but the facilitation team recovered the flow without affecting the core agenda.',
      lessons_learned:
        'Technical setup should begin earlier, one volunteer should be assigned exclusively to registration, and session materials should be packed in advance with a clearer handover plan.',
      budget_notes:
        'Refreshments came in slightly below estimate while extra participant handouts and documentation support pushed a few lines upward. Overall variance stayed within an acceptable operational range.',
      donations_received: String(1500 + (now.getSeconds() % 5) * 500),
      donation_notes: 'A local partner supported refreshments and a small cash contribution was collected during the event for follow-up support.',
      actual_start_time: '10:12',
      actual_end_time: '16:05',
      actual_location: event.location,
      social_media_writeup:
        `Published a same-day impact summary highlighting ${event.goal?.toLowerCase() || 'the event'}, key participant takeaways, volunteer participation, and photo-based documentation for NGO channels.`,
      follow_up_actions:
        'Share summary notes with stakeholders, circulate attendance and outcome highlights, schedule a follow-up review call, and track participant commitments through the regional team.',
    })

    setBudgetLines((current) =>
      current.map((line, index) => ({
        ...line,
        actual_amount: Math.max(0, Number(line.estimated_amount) - (index % 2 === 0 ? 150 : 75) + (index === 2 ? 220 : index === 4 ? 180 : 0)),
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
      <div className="border-b app-border-soft app-panel px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/events/${id}`}>
              <button className="app-nav-button rounded-xl p-2 hover:bg-[var(--app-surface-soft)]">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1 className="app-text-strong text-xl font-semibold">Event Completion Report</h1>
              <p className="app-text-muted text-sm">{event.event_code} - {event.title}</p>
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
            {demoAutofillEnabled ? (
              <Button type="button" variant="outline" onClick={handleAutofill}>
                Autofill Test Data
              </Button>
            ) : (
              <span className="app-text-muted text-xs">Demo autofill is disabled in Settings.</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-emerald-500/20 bg-[linear-gradient(135deg,color-mix(in_srgb,#22c55e_12%,var(--app-surface-strong)_88%),var(--app-surface-strong)_55%,color-mix(in_srgb,#0ea5e9_8%,var(--app-surface-strong)_92%))]">
            <CardHeader>
              <CardTitle>ECR Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="app-text-muted text-sm">
                Capture the actual execution of the event, document changes from the original proposal, and prepare a clean final report for leadership, Finance, and Accounts.
              </p>
              <div className="flex flex-wrap gap-2">
                {SECTION_LINKS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="app-nav-button rounded-full px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-[var(--app-surface-soft)] dark:text-emerald-300"
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
                    <p className="app-text-muted text-sm">No budget lines were submitted on the EPF.</p>
                  )}

                  {budgetLines.length > 0 && (
                    <div className="app-panel-soft overflow-x-auto rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="app-table-head">
                          <tr className="text-left">
                            <th className="app-text-subtle px-4 py-3 font-medium">Category</th>
                            <th className="app-text-subtle px-4 py-3 font-medium">Proposed</th>
                            <th className="app-text-subtle px-4 py-3 font-medium">Actual</th>
                            <th className="app-text-subtle px-4 py-3 font-medium">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetLines.map((line, index) => {
                            const proposed = Number(line.estimated_amount) || 0
                            const actual = Number(line.actual_amount) || 0
                            const variance = actual - proposed
                            return (
                              <tr key={`${line.category}-${index}`} className="app-table-row border-t">
                                <td className="app-text-strong px-4 py-3 font-medium">{line.category}</td>
                                <td className="app-text-muted px-4 py-3">Rs {proposed.toLocaleString('en-IN')}</td>
                                <td className="app-text-muted px-4 py-3">Rs {actual.toLocaleString('en-IN')}</td>
                                <td className={`px-4 py-3 font-medium ${variance > 0 ? 'text-red-600 dark:text-red-300' : variance < 0 ? 'text-emerald-700 dark:text-emerald-300' : 'app-text-muted'}`}>
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
              <div className="app-danger-soft rounded-md p-3 text-sm">{error}</div>
            )}

            <div className="app-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
              <p className="app-text-muted text-sm">
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
            <CardContent className="app-text-muted space-y-3 text-sm">
              <p>Use actual execution details rather than repeating proposal wording.</p>
              <p>Highlight what changed, what worked, and what should improve next time.</p>
              <p>Finance and Accounts will compare this report with the original EPF and budget lines.</p>
              <div className="app-warning-soft rounded-xl p-3">
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
      <p className="app-text-subtle text-xs">{helper}</p>
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
    green: 'app-success-soft',
    cyan: 'app-info-soft',
    red: 'app-danger-soft',
    slate: 'app-panel-soft app-text-strong',
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
    <div className="app-panel-soft flex items-start gap-3 rounded-lg p-3">
      <div className="app-text-subtle mt-0.5">{icon}</div>
      <div>
        <p className="app-text-subtle text-xs uppercase tracking-wide">{label}</p>
        <p className="app-text-strong font-medium">{value}</p>
      </div>
    </div>
  )
}
