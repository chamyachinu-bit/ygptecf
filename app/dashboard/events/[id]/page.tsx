import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, ExternalLink, MapPin, Target, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ApprovalTimeline } from '@/components/events/ApprovalTimeline'
import { BudgetLineItems } from '@/components/events/BudgetLineItems'
import { DriveFoldersPanel } from '@/components/events/DriveFoldersPanel'
import { GeneratePdfButton } from '@/components/reports/PrintReportButton'
import { StatusBadge } from '@/components/events/StatusBadge'
import { EmptyState, PageHero, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils/formatters'
import { ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import { prettyWorkflowStatus } from '@/lib/workflows/creative'
import type { Approval, Budget, EventFile, EventReport, FlyerRequest, SocialWorkflowItem } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role === 'designer' || profile?.role === 'social_media_team') {
    const service = await createServiceClient()
    const [{ data: eventData }, { data: reportData }, { data: flyerData }, { data: socialData }] = await Promise.all([
      service.from('events').select('*').eq('id', id).single(),
      service.from('event_reports').select('*').eq('event_id', id).maybeSingle(),
      service.from('flyer_requests').select('*').eq('event_id', id).maybeSingle(),
      service.from('social_workflow_items').select('*').eq('event_id', id).maybeSingle(),
    ])

    const event = eventData
    if (!event) notFound()

    if (profile.role === 'designer') {
      if (!flyerData && !event.social_media_required) {
        redirect('/dashboard/flyer-requests')
      }
      return (
        <CreativeContextView
          mode="designer"
          event={event}
          flyerRequest={(flyerData as FlyerRequest | null) ?? null}
        />
      )
    }

    if (!reportData) {
      redirect('/dashboard/social-workflow')
    }

    return (
      <CreativeContextView
        mode="social"
        event={event}
        report={(reportData as EventReport | null) ?? null}
        socialWorkflow={(socialData as SocialWorkflowItem | null) ?? null}
      />
    )
  }

  const [{ data: event }, { data: directReport }] = await Promise.all([
    supabase
      .from('events')
      .select(
        `
        *,
        profiles:created_by(full_name, email, region, role),
        budgets(*),
        approvals(*, profiles:reviewer_id(full_name, role), approval_comments(*)),
        files(*),
        event_reports(*)
      `
      )
      .eq('id', id)
      .single(),
    supabase.from('event_reports').select('*').eq('event_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!event) notFound()

  const report = ((event.event_reports?.[0] ?? directReport) ?? null) as EventReport | null
  const files = (event.files ?? []) as EventFile[]
  const totalEstimated = (event.budgets ?? []).reduce((sum: number, line: Budget) => sum + Number(line.estimated_amount || 0), 0)
  const totalActual = (event.budgets ?? []).reduce((sum: number, line: Budget) => sum + Number(line.actual_amount || 0), 0)
  const reviewableStatuses = profile?.role ? ROLE_REVIEWABLE_STATUSES[profile.role as keyof typeof ROLE_REVIEWABLE_STATUSES] : undefined
  const hasExistingStageApproval = !!event.approvals?.some((approval: Approval) => approval.stage === profile?.role)
  const canApprove = !!profile && (profile.role === 'admin' || !!reviewableStatuses?.includes(event.status) || hasExistingStageApproval)
  const canSubmit = event.status === 'draft' && event.created_by === user.id
  const canEditProposal = event.created_by === user.id && ['draft', 'submitted', 'on_hold'].includes(event.status)
  const canComplete = event.status === 'funded' && (profile?.role === 'admin' || (profile?.role === 'regional_coordinator' && event.created_by === user.id))
  const canReport = event.status === 'completed' && event.created_by === user.id
  const canEditReport = !!report && (event.created_by === user.id || profile?.role === 'admin') && ['completed', 'report_submitted', 'archived'].includes(event.status)
  const canArchive = event.status === 'report_submitted' && profile?.role === 'admin'
  const canRefreshDrive = event.created_by === user.id || profile?.role === 'admin'

  const driveFolders = [
    { key: 'proposal', label: 'Proposal Folder', description: 'Proposal documents and supporting planning files.', url: event.proposal_drive_url },
    { key: 'media', label: 'Media Folder', description: 'Photos, videos, captions, and media outputs.', url: event.media_drive_url },
    { key: 'report', label: 'Report Folder', description: 'Completion evidence and report support material.', url: event.report_drive_url },
    { key: 'invoice', label: 'Invoice Folder', description: 'Invoices, receipts, and finance documents.', url: event.invoice_drive_url },
  ]

  const eventSummary = [
    { icon: <Target className="h-4 w-4" />, label: 'Goal', value: event.goal || 'General event' },
    { icon: <MapPin className="h-4 w-4" />, label: 'Venue', value: event.location },
    { icon: <Calendar className="h-4 w-4" />, label: 'Dates', value: `${formatDate(event.event_date)}${event.event_end_date ? ` -> ${formatDate(event.event_end_date)}` : ''}` },
    { icon: <Clock className="h-4 w-4" />, label: 'Time', value: `${event.start_time || 'TBD'} - ${event.end_time || 'TBD'}` },
    { icon: <Users className="h-4 w-4" />, label: 'Expected attendance', value: `${event.expected_attendees}` },
  ]

  return (
    <div>
      <PageShell>
        <PageHero
          lead={
            <Link href="/dashboard/events">
              <Button size="sm" variant="secondary" className="border border-white/80 bg-white text-slate-900 shadow-lg hover:bg-slate-100">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Button>
            </Link>
          }
          eyebrow="Event Workspace"
          title={`${event.event_code} · ${event.title}`}
          subtitle={`Created ${formatRelative(event.created_at)}. Use this workspace to review proposal quality, budget scope, linked Drive folders, and reporting readiness.`}
          actions={
            <div className="flex flex-wrap gap-2">
              {canApprove && (
                <Link href={`/dashboard/events/${id}/approve`}>
                  <Button size="sm">Review And Approve</Button>
                </Link>
              )}
              {canSubmit && <SubmitButton eventId={id} />}
              {canEditProposal && (
                <Link href={`/dashboard/events/${id}/edit`}>
                  <Button size="sm" variant="outline">Edit Proposal</Button>
                </Link>
              )}
              {canComplete && <CompleteButton eventId={id} />}
              {canReport && (
                <Link href={`/dashboard/events/${id}/report`}>
                  <Button size="sm" variant="outline">Submit Report</Button>
                </Link>
              )}
              {canEditReport && (
                <Link href={`/dashboard/events/${id}/report`}>
                  <Button size="sm" variant="outline">View / Edit Report</Button>
                </Link>
              )}
              {canArchive && <ArchiveButton eventId={id} />}
              {report && (
                <>
                  <Link href={`/dashboard/events/${id}/final-report`}>
                    <Button size="sm" variant="outline">Open Final Report</Button>
                  </Link>
                  <GeneratePdfButton href={`/api/events/${id}/final-report-pdf`} />
                </>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <StatusBadge status={event.status} flagged={event.is_budget_flagged} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-emerald-100/70">Region</p>
                <p className="mt-2 text-lg font-semibold">{event.region}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-emerald-100/70">Current reviewer</p>
                <p className="mt-2 text-lg font-semibold">{event.current_reviewer ? event.current_reviewer.replace('_', ' ') : 'None'}</p>
              </div>
            </div>
          </div>
        </PageHero>

        <StatGrid>
          <StatCard label="Planned budget" value={formatCurrency(totalEstimated)} helper="Original EPF budget total" />
          <StatCard label="Actual spend" value={formatCurrency(totalActual)} helper="Updated from ECR actuals" />
          <StatCard label="Report status" value={report ? 'Available' : 'Pending'} helper={report ? 'Final report can be opened' : 'Submit ECR to unlock'} />
          <StatCard label="Support files" value={String(files.length)} helper="Legacy uploads still visible below" />
        </StatGrid>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-6">
            <SectionBlock title="EPF Details" subtitle="The original proposal context, venue, coordinator details, and participation expectations.">
              <div className="grid gap-4">
                {event.description ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-700">
                    {event.description}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {eventSummary.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
                      <div className="mb-2 flex items-center gap-2 text-slate-500">
                        {item.icon}
                        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{item.label}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                {event.venue_gmaps_link && (
                  <a href={event.venue_gmaps_link} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <ExternalLink className="h-4 w-4" />
                    Open venue in Google Maps
                  </a>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <InfoBlock title="Participant Profile" value={event.participant_profile} fallback="Participant profile not specified." />
                  <InfoBlock
                    title="Coordinator"
                    value={[event.coordinator_name, event.coordinator_email, event.coordinator_phone].filter(Boolean).join('\n')}
                    fallback="Coordinator details are incomplete."
                    multiline
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <InfoBlock title="Budget Justification" value={event.budget_justification} fallback="No budget justification added." />
                  <InfoBlock
                    title="Social Media Requirements"
                    value={
                      event.social_media_required
                        ? [event.social_media_channels?.join(', '), event.social_media_requirements, event.social_media_caption].filter(Boolean).join('\n\n')
                        : 'Social media support not required.'
                    }
                  />
                </div>

                {event.is_budget_flagged && event.flag_reason && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Budget alert: {event.flag_reason}
                  </div>
                )}
              </div>
            </SectionBlock>

            <SectionBlock title="Budget Breakdown" subtitle="Review the proposed and actual cost structure line by line.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Estimated budget</p>
                  <p className="mt-3 text-3xl font-semibold text-emerald-800">{formatCurrency(totalEstimated)}</p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Actual budget</p>
                  <p className="mt-3 text-3xl font-semibold text-cyan-800">{formatCurrency(totalActual)}</p>
                </div>
              </div>
              <div className="mt-5">
                <BudgetLineItems items={(event.budgets as Budget[]) ?? []} readOnly showActual />
              </div>
            </SectionBlock>

            <DriveFoldersPanel
              eventId={id}
              title="Drive Workspace"
              description="This event now uses Google Drive as the source of truth for proposal, media, report, and invoice documents."
              folders={driveFolders}
              syncStatus={event.drive_sync_status}
              syncMessage={event.drive_sync_message}
              canRefresh={canRefreshDrive}
            />

            {files.length > 0 && (
              <SectionBlock title="Legacy Uploaded Files" subtitle="Older uploads are preserved here, but new supporting documents should use the Drive folders above.">
                <div className="grid gap-3">
                  {files.map((file) => (
                    <div key={file.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-900">{file.file_name}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{file.file_type}</p>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            )}

            {report ? (
              <SectionBlock title="ECR Summary" subtitle="Snapshot of the submitted completion report and operational outcome.">
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoBlock title="Actual attendees" value={String(report.actual_attendees ?? 'N/A')} />
                  <InfoBlock title="Donations received" value={formatCurrency(report.donations_received ?? 0)} />
                  <InfoBlock title="Actual venue" value={report.actual_location || event.location} />
                  <InfoBlock title="Actual time" value={`${report.actual_start_time || 'TBD'} - ${report.actual_end_time || 'TBD'}`} />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <InfoBlock title="Execution Details" value={report.execution_details} fallback="No execution details recorded." />
                  <InfoBlock title="Outcome Summary" value={report.outcome_summary} fallback="No outcome summary recorded." />
                  <InfoBlock title="Challenges" value={report.challenges} fallback="No challenges recorded." />
                  <InfoBlock title="Follow-Up Actions" value={report.follow_up_actions} fallback="No follow-up actions recorded." />
                </div>
              </SectionBlock>
            ) : (
              ['completed', 'report_submitted', 'archived'].includes(event.status) && (
                <EmptyState
                  title="Final report not ready yet"
                  message="This event can have a final report, but no Event Completion Report data is available yet. Submit or update the ECR first."
                  action={
                    <Link href={`/dashboard/events/${id}/report`}>
                      <Button>Open Report Editor</Button>
                    </Link>
                  }
                />
              )
            )}
          </div>

          <div className="space-y-6">
            <SectionBlock title="Ownership" subtitle="Event creator and originating region.">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {(event.profiles as { full_name?: string })?.full_name?.charAt(0) || 'E'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{(event.profiles as { full_name?: string })?.full_name || 'Unknown user'}</p>
                  <p className="text-sm text-slate-500">{(event.profiles as { region?: string })?.region || 'No region'}</p>
                </div>
              </div>
            </SectionBlock>

            <SectionBlock title="Approval Progress" subtitle="Every stage decision, including revisions, is preserved in the timeline.">
              <ApprovalTimeline approvals={(event.approvals as Approval[]) ?? []} />
            </SectionBlock>
          </div>
        </div>
      </PageShell>
    </div>
  )
}

function InfoBlock({
  title,
  value,
  fallback,
  multiline = true,
}: {
  title: string
  value?: string | null
  fallback?: string
  multiline?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className={`mt-3 text-sm leading-6 text-slate-700 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value || fallback || 'Not available.'}</p>
    </div>
  )
}

function SubmitButton({ eventId }: { eventId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        const { createClient: createSC } = await import('@/lib/supabase/server')
        const supabase = await createSC()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        await supabase
          .from('events')
          .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            current_reviewer: 'events_team',
          })
          .eq('id', eventId)
          .eq('created_by', user.id)
        const { redirect } = await import('next/navigation')
        redirect(`/dashboard/events/${eventId}`)
      }}
    >
      <Button size="sm" type="submit">Submit for Review</Button>
    </form>
  )
}

function CompleteButton({ eventId }: { eventId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        const { createClient: createSC } = await import('@/lib/supabase/server')
        const supabase = await createSC()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile) return
        if (profile.role !== 'admin' && profile.role !== 'regional_coordinator') return
        const query = supabase
          .from('events')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', eventId)
        if (profile.role !== 'admin') {
          query.eq('created_by', user.id)
        }
        await query
        const { redirect } = await import('next/navigation')
        redirect(`/dashboard/events/${eventId}`)
      }}
    >
      <Button size="sm" variant="outline" type="submit">Mark as Completed</Button>
    </form>
  )
}

function ArchiveButton({ eventId }: { eventId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        const { createClient: createSC } = await import('@/lib/supabase/server')
        const supabase = await createSC()
        await supabase
          .from('events')
          .update({
            status: 'archived',
            current_reviewer: null,
          })
          .eq('id', eventId)
        const { redirect } = await import('next/navigation')
        redirect(`/dashboard/events/${eventId}`)
      }}
    >
      <Button size="sm" variant="outline" type="submit">Archive Event</Button>
    </form>
  )
}

function CreativeContextView({
  mode,
  event,
  report,
  flyerRequest,
  socialWorkflow,
}: {
  mode: 'designer' | 'social'
  event: {
    id: string
    event_code: string
    title: string
    description: string | null
    goal: string | null
    region: string
    event_date: string
    location: string
    expected_attendees: number
    social_media_required?: boolean
    social_media_requirements?: string | null
    social_media_caption?: string | null
    social_media_channels?: string[]
    proposal_drive_url?: string | null
    media_drive_url?: string | null
    report_drive_url?: string | null
  }
  report?: EventReport | null
  flyerRequest?: FlyerRequest | null
  socialWorkflow?: SocialWorkflowItem | null
}) {
  const isSocial = mode === 'social'

  return (
    <div>
      <PageShell>
        <PageHero
          lead={
            <Link href={isSocial ? '/dashboard/social-workflow' : '/dashboard/flyer-requests'}>
              <Button size="sm" variant="secondary" className="border border-white/80 bg-white text-slate-900 shadow-lg hover:bg-slate-100">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {isSocial ? 'Social Workflow' : 'Flyer Requests'}
              </Button>
            </Link>
          }
          eyebrow={isSocial ? 'Social-safe event context' : 'Creative event context'}
          title={`${event.event_code} · ${event.title}`}
          subtitle={
            isSocial
              ? 'This view is intentionally limited to event-story context, participation, and narrative reporting. Finance data is hidden.'
              : 'This view is intentionally limited to flyer-relevant context, creative brief content, and shared folders.'
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-emerald-100/70">Region</p>
              <p className="mt-2 text-lg font-semibold">{event.region}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-emerald-100/70">Workflow status</p>
              <p className="mt-2 text-lg font-semibold">
                {prettyWorkflowStatus(isSocial ? (socialWorkflow?.status ?? 'requested') : (flyerRequest?.status ?? 'requested'))}
              </p>
            </div>
          </div>
        </PageHero>

        <StatGrid>
          <StatCard label="Date" value={formatDate(event.event_date)} helper="Event schedule context" />
          <StatCard label="Venue" value={event.location} helper="Location for creative alignment" />
          <StatCard
            label={isSocial ? 'Participants' : 'Expected attendees'}
            value={String(isSocial ? (report?.actual_attendees ?? event.expected_attendees) : event.expected_attendees)}
            helper={isSocial ? 'Actual attendance or fallback expected count' : 'Audience sizing for flyer copy'}
          />
          <StatCard
            label={isSocial ? 'Narrative status' : 'Creative brief'}
            value={isSocial ? (report?.outcome_summary ? 'Ready' : 'Pending') : (event.social_media_required ? 'Enabled' : 'General')}
            helper={isSocial ? 'Outcome summary available for storytelling' : 'Use the creative details below'}
          />
        </StatGrid>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <SectionBlock
              title={isSocial ? 'Event story context' : 'Creative brief context'}
              subtitle={isSocial ? 'Only the text and metrics relevant for social storytelling are shown below.' : 'Use this brief to prepare flyer design without operational clutter.'}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBlock title="Goal" value={event.goal || 'General event'} />
                <InfoBlock title="Description" value={event.description} fallback="No extended description provided." />
                {!isSocial && (
                  <InfoBlock
                    title="Creative Requirements"
                    value={[event.social_media_requirements, event.social_media_caption, event.social_media_channels?.join(', ')].filter(Boolean).join('\n\n')}
                    fallback="No extra creative requirements were provided."
                  />
                )}
                {isSocial && (
                  <>
                    <InfoBlock title="Outcome Summary" value={report?.outcome_summary} fallback="Outcome summary not available yet." />
                    <InfoBlock title="Execution Summary" value={report?.execution_details} fallback="Execution summary not available yet." />
                    <InfoBlock title="Challenges / Lessons" value={[report?.challenges, report?.lessons_learned].filter(Boolean).join('\n\n')} fallback="No narrative learning notes available yet." />
                    <InfoBlock title="Follow-up / Social Writeup" value={[report?.follow_up_actions, report?.social_media_writeup].filter(Boolean).join('\n\n')} fallback="No follow-up or social writeup recorded yet." />
                  </>
                )}
              </div>
            </SectionBlock>

            <SectionBlock
              title="Relevant folders"
              subtitle={isSocial ? 'Only the content-supporting folders are surfaced here.' : 'Use these shared folders for the flyer handoff and creative reference.'}
            >
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: 'Proposal Folder', url: event.proposal_drive_url },
                  { label: 'Media Folder', url: event.media_drive_url },
                  ...(isSocial ? [{ label: 'Report Folder', url: event.report_drive_url }] : []),
                ].map((link) => (
                  <div key={link.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">{link.label}</p>
                    {link.url ? (
                      <a href={link.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline">
                        <ExternalLink className="h-4 w-4" />
                        Open folder
                      </a>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Link not configured yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionBlock>
          </div>

          <div className="space-y-6">
            <SectionBlock title="Access guard" subtitle="This role-safe page intentionally hides finance and approval actions.">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
                {isSocial
                  ? 'Budgets, donations, invoices, variance tables, report exports, and reviewer controls are hidden here by design.'
                  : 'Approvals, budgets, reports, and finance controls are hidden here by design so the designer can focus only on creative delivery.'}
              </div>
            </SectionBlock>
          </div>
        </div>
      </PageShell>
    </div>
  )
}
