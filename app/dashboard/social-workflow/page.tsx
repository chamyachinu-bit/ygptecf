import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { CalendarDays, ExternalLink, FileText, MapPin, Target, Users } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { SOCIAL_STATUSES, getSocialWorkflowPath, prettyWorkflowStatus } from '@/lib/workflows/creative'
import { formatDate } from '@/lib/utils/formatters'
import type { Event, EventReport, Profile, SocialWorkflowItem } from '@/types/database'

type SocialRow = {
  event: Event
  report: EventReport
  workflow: SocialWorkflowItem | null
  creatorName: string | null
}

export default async function SocialWorkflowPage() {
  const supabase = await createClient()
  const service = await createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile) redirect('/login')
  if (profile.role !== 'social_media_team') redirect('/dashboard')

  async function updateSocialWorkflow(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const service = await createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const profile = profileData as Profile | null
    if (!profile || profile.role !== 'social_media_team') redirect('/dashboard')

    const eventId = String(formData.get('event_id') || '')
    const status = String(formData.get('status') || 'requested') as SocialWorkflowItem['status']
    const driveLink = String(formData.get('drive_link') || '').trim()
    const captionText = String(formData.get('caption_text') || '').trim()
    const contentNotes = String(formData.get('content_notes') || '').trim()

    if (!eventId) redirect(getSocialWorkflowPath())
    if ((status === 'submitted' || status === 'approved' || status === 'completed') && !driveLink) {
      redirect(`${getSocialWorkflowPath()}?error=drive`)
    }

    const { data: event } = await service
      .from('events')
      .select('id, title, created_by')
      .eq('id', eventId)
      .single()

    if (!event) redirect(getSocialWorkflowPath())

    await service.from('social_workflow_items').upsert(
      {
        event_id: eventId,
        requested_by: event.created_by,
        assigned_social_owner: user.id,
        status,
        drive_link: driveLink || null,
        caption_text: captionText || null,
        content_notes: contentNotes || null,
        completion_notes: status === 'completed' ? contentNotes || null : null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      },
      { onConflict: 'event_id' }
    )

    await service.from('notifications').insert({
      user_id: event.created_by,
      event_id: eventId,
      link_path: getSocialWorkflowPath(),
      type: 'status_changed',
      title: 'Social workflow updated',
      message: `Social documentation for "${event.title}" is now ${prettyWorkflowStatus(status)}.`,
    })

    redirect(`${getSocialWorkflowPath()}?saved=social`)
  }

  const [{ data: eventsData }, { data: reportsData }, { data: workflowsData }] = await Promise.all([
    service
      .from('events')
      .select('*, profiles:created_by(full_name)')
      .in('status', ['completed', 'report_submitted', 'archived'])
      .order('event_date', { ascending: false }),
    service.from('event_reports').select('*').order('created_at', { ascending: false }),
    service.from('social_workflow_items').select('*').order('updated_at', { ascending: false }),
  ])

  const reports = (reportsData ?? []) as EventReport[]
  const workflows = (workflowsData ?? []) as SocialWorkflowItem[]
  const reportByEvent = new Map<string, EventReport>()
  reports.forEach((report) => {
    const existing = reportByEvent.get(report.event_id)
    if (!existing || report.created_at > existing.created_at) reportByEvent.set(report.event_id, report)
  })
  const workflowByEvent = new Map(workflows.map((row) => [row.event_id, row]))

  const rows: SocialRow[] = ((eventsData ?? []) as (Event & { profiles?: { full_name?: string } })[])
    .map((event) => {
      const report = reportByEvent.get(event.id)
      if (!report) return null
      return {
        event,
        report,
        workflow: workflowByEvent.get(event.id) ?? null,
        creatorName: event.profiles?.full_name ?? null,
      }
    })
    .filter((row): row is SocialRow => row !== null)

  const stats = [
    { label: 'Storytelling Queue', value: String(rows.length), helper: 'Documented events in scope' },
    { label: 'Submitted Packs', value: String(rows.filter((row) => row.workflow?.status === 'submitted').length), helper: 'Awaiting approval or completion' },
    { label: 'Completed', value: String(rows.filter((row) => row.workflow?.status === 'completed').length), helper: 'Ready for public use' },
    { label: 'In Progress', value: String(rows.filter((row) => ['requested', 'in_progress'].includes(row.workflow?.status ?? 'requested')).length), helper: 'Still being prepared' },
  ]

  return (
    <div>
      <Header
        title="Social Workflow"
        subtitle="This is the storytelling workspace for Social Media Team. Only narrative context and relevant participation details are shown here, never finance data."
        eyebrow="Social media workflow"
      />
      <PageShell>
        <StatGrid>
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </StatGrid>

        <SectionBlock
          title="Post-event documentation queue"
          subtitle="Only completed and documented events appear here. Money, budgets, invoices, and finance-only comparisons are intentionally hidden."
        >
          {rows.length === 0 ? (
            <EmptyState
              title="No documented events are in scope"
              message="Once an event is completed and the ECR is submitted, it will appear here for social packaging and documentation."
            />
          ) : (
            <div className="space-y-4">
              {rows.map(({ event, report, workflow, creatorName }) => (
                <Card key={event.id} className="rounded-[1.5rem] border-slate-200/80">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{event.event_code}</p>
                        <CardTitle className="mt-2 text-lg">{event.title}</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">
                          Coordinator {creatorName ?? 'Unknown'} · {prettyWorkflowStatus(workflow?.status ?? 'requested')}
                        </p>
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Narrative-only view
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <MiniInfo icon={<CalendarDays className="h-4 w-4" />} label="Date" value={formatDate(event.event_date)} />
                      <MiniInfo icon={<MapPin className="h-4 w-4" />} label="Venue" value={report.actual_location || event.location} />
                      <MiniInfo icon={<Target className="h-4 w-4" />} label="Goal" value={event.goal || 'General event'} />
                      <MiniInfo icon={<Users className="h-4 w-4" />} label="Participants" value={`${report.actual_attendees ?? event.expected_attendees} actual`} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <NarrativePanel title="Outcome Summary" value={report.outcome_summary || 'Outcome summary not provided yet.'} />
                      <NarrativePanel title="Execution Summary" value={report.execution_details || 'Execution details not provided yet.'} />
                      <NarrativePanel title="Challenges / Lessons" value={[report.challenges, report.lessons_learned].filter(Boolean).join('\n\n') || 'No narrative notes available yet.'} />
                      <NarrativePanel title="Follow-up / Existing Writeup" value={[report.follow_up_actions, report.social_media_writeup].filter(Boolean).join('\n\n') || 'No follow-up or social writeup recorded yet.'} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <form action={updateSocialWorkflow} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[0.7fr_1.3fr_auto]">
                        <input type="hidden" name="event_id" value={event.id} />
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</label>
                          <select
                            name="status"
                            defaultValue={workflow?.status ?? 'requested'}
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            {SOCIAL_STATUSES.map((status) => (
                              <option key={status} value={status}>{prettyWorkflowStatus(status)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Drive Link</label>
                            <input
                              type="url"
                              name="drive_link"
                              defaultValue={workflow?.drive_link ?? ''}
                              placeholder="https://drive.google.com/..."
                              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Caption / Headline</label>
                            <input
                              type="text"
                              name="caption_text"
                              defaultValue={workflow?.caption_text ?? ''}
                              placeholder="Short caption or campaign line"
                              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button type="submit" className="w-full">Save social update</Button>
                        </div>
                        <div className="lg:col-span-3">
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Content Notes</label>
                          <textarea
                            name="content_notes"
                            defaultValue={workflow?.content_notes ?? ''}
                            placeholder="Pack summary, asset note, public-facing angle, or handoff note"
                            className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </form>

                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <a href={event.media_drive_url || '#'} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 text-sm font-medium ${event.media_drive_url ? 'text-green-700 hover:underline' : 'text-slate-400 pointer-events-none'}`}>
                          <ExternalLink className="h-4 w-4" />
                          Media folder
                        </a>
                        <a href={event.report_drive_url || '#'} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 text-sm font-medium ${event.report_drive_url ? 'text-green-700 hover:underline' : 'text-slate-400 pointer-events-none'}`}>
                          <ExternalLink className="h-4 w-4" />
                          Report folder
                        </a>
                        <Link href={`/dashboard/events/${event.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline">
                          <FileText className="h-4 w-4" />
                          Open social-safe event context
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </SectionBlock>
      </PageShell>
    </div>
  )
}

function MiniInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

function NarrativePanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  )
}
