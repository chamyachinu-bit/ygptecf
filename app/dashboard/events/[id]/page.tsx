import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Users, Clock, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/events/StatusBadge'
import { ApprovalTimeline } from '@/components/events/ApprovalTimeline'
import { BudgetLineItems } from '@/components/events/BudgetLineItems'
import { EventFilesPanel } from '@/components/events/EventFilesPanel'
import { formatDate, formatRelative, formatCurrency } from '@/lib/utils/formatters'
import { ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import type { Event, Approval, Budget, EventFile, EventReport } from '@/types/database'

interface PageProps { params: Promise<{ id: string }> }

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      profiles:created_by(full_name, email, region, role),
      budgets(*),
      approvals(*, profiles:reviewer_id(full_name, role), approval_comments(*)),
      files(*),
      event_reports(*)
    `)
    .eq('id', id)
    .single()

  const { data: appSettings } = await supabase
    .from('app_settings')
    .select('media_drive_url')
    .eq('id', 'global')
    .maybeSingle()

  if (!event) notFound()

  const report = (event.event_reports?.[0] ?? null) as EventReport | null
  const files = (event.files ?? []) as EventFile[]
  const proposalFiles = files.filter((file) => file.file_type !== 'report_image')
  const reportFiles = files.filter((file) => file.file_type === 'report_image')
  const totalEstimated = (event.budgets ?? []).reduce((sum: number, line: Budget) => sum + Number(line.estimated_amount || 0), 0)
  const totalActual = (event.budgets ?? []).reduce((sum: number, line: Budget) => sum + Number(line.actual_amount || 0), 0)

  const reviewableStatuses = profile?.role ? ROLE_REVIEWABLE_STATUSES[profile.role as keyof typeof ROLE_REVIEWABLE_STATUSES] : undefined
  const hasExistingStageApproval = !!event.approvals?.some((a: Approval) => a.stage === profile.role)
  const canApprove = !!profile && (!!reviewableStatuses?.includes(event.status) || hasExistingStageApproval)

  const canSubmit = event.status === 'draft' && event.created_by === user.id
  const canEditProposal = event.created_by === user.id && ['draft', 'submitted', 'on_hold'].includes(event.status)
  const canComplete = event.status === 'funded' &&
    (event.created_by === user.id || profile?.role === 'admin')
  const canReport = event.status === 'completed' && event.created_by === user.id
  const canEditReport = !!report && (event.created_by === user.id || profile?.role === 'admin') && ['completed', 'report_submitted', 'archived'].includes(event.status)
  const canArchive = event.status === 'report_submitted' &&
    (event.created_by === user.id || profile?.role === 'admin')
  const canUploadProposalFiles = event.created_by === user.id && event.status === 'draft'

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/events">
            <button className="p-1.5 rounded hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{event.event_code} · {event.title}</h1>
            <p className="text-xs text-gray-500">{formatRelative(event.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={event.status} flagged={event.is_budget_flagged} />
          {canApprove && (
            <Link href={`/dashboard/events/${id}/approve`}>
              <Button size="sm">Review & Approve</Button>
            </Link>
          )}
          {canSubmit && (
            <SubmitButton eventId={id} />
          )}
          {canEditProposal && (
            <Link href={`/dashboard/events/${id}/edit`}>
              <Button size="sm" variant="outline">Edit Proposal</Button>
            </Link>
          )}
          {canComplete && (
            <CompleteButton eventId={id} />
          )}
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
          {canArchive && (
            <ArchiveButton eventId={id} />
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>EPF Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {event.description && (
                <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
              )}

              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span>{event.goal || 'General event'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {formatDate(event.event_date)}
                    {event.event_end_date && ` → ${formatDate(event.event_end_date)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{event.start_time || 'TBD'} - {event.end_time || 'TBD'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{event.expected_attendees} expected attendees</span>
                </div>
                <div className="text-gray-600">
                  <span className="text-gray-400 text-xs mr-2">Region:</span>
                  <span>{event.region}</span>
                </div>
              </div>

              {event.participant_profile && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Participant Profile</p>
                  <p className="text-sm text-gray-700">{event.participant_profile}</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Coordinator</p>
                  <p className="text-sm font-medium">{event.coordinator_name || 'Not set'}</p>
                  <p className="text-sm text-gray-600">{event.coordinator_email || 'No email'}</p>
                  <p className="text-sm text-gray-600">{event.coordinator_phone || 'No phone'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Social Media</p>
                  <p className="text-sm text-gray-700">
                    {event.social_media_required ? 'Required' : 'Not required'}
                  </p>
                  {event.social_media_required && (
                    <>
                      <p className="text-sm text-gray-600 mt-1">{event.social_media_channels?.join(', ') || 'Channels not set'}</p>
                      {event.social_media_requirements && <p className="text-sm text-gray-600 mt-2">{event.social_media_requirements}</p>}
                    </>
                  )}
                </div>
              </div>

              {event.is_budget_flagged && event.flag_reason && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700">
                  Budget alert: {event.flag_reason}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Budget Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-gray-600">Estimated Budget</p>
                  <p className="text-xl font-semibold text-green-700">{formatCurrency(totalEstimated)}</p>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-sm text-gray-600">Actual Budget</p>
                  <p className="text-xl font-semibold text-cyan-700">{formatCurrency(totalActual)}</p>
                </div>
              </div>
              <BudgetLineItems
                items={event.budgets as Budget[] ?? []}
                readOnly
                showActual
              />
              {event.budget_justification && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Budget Justification</p>
                  <p className="text-sm text-gray-700">{event.budget_justification}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <EventFilesPanel
            files={proposalFiles}
            eventId={id}
            userId={user.id}
            canUpload={canUploadProposalFiles}
            uploadLabel="Proposal Attachments"
            fileType="proposal_attachment"
            driveLink={appSettings?.media_drive_url}
          />

          {report && (
            <>
              <Card>
                <CardHeader><CardTitle>ECR Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 text-sm">
                    <div>
                      <span className="text-gray-500">Actual Attendees:</span> <strong>{report.actual_attendees ?? 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Donations Received:</span> <strong>{formatCurrency(report.donations_received ?? 0)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Actual Venue:</span> {report.actual_location || event.location}
                    </div>
                    <div>
                      <span className="text-gray-500">Actual Time:</span> {report.actual_start_time || 'TBD'} - {report.actual_end_time || 'TBD'}
                    </div>
                  </div>

                  {report.execution_details && (
                    <Section label="Execution Details" value={report.execution_details} />
                  )}
                  {report.outcome_summary && (
                    <Section label="Outcome Summary" value={report.outcome_summary} />
                  )}
                  {report.challenges && (
                    <Section label="Issues / Challenges" value={report.challenges} />
                  )}
                  {report.social_media_writeup && (
                    <Section label="Social Media Writeup" value={report.social_media_writeup} />
                  )}
                  {report.follow_up_actions && (
                    <Section label="Follow-Up Actions" value={report.follow_up_actions} />
                  )}
                  {report.auto_summary && (
                    <Section label="Auto Summary" value={report.auto_summary} mono />
                  )}
                </CardContent>
              </Card>

              <EventFilesPanel
                files={reportFiles}
                eventId={id}
                userId={user.id}
                uploadLabel="Report Images & Attachments"
                fileType="report_image"
                driveLink={appSettings?.media_drive_url}
              />
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Submitted By</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                  {(event.profiles as { full_name: string })?.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{(event.profiles as { full_name: string })?.full_name}</p>
                  <p className="text-xs text-gray-500">{(event.profiles as { region?: string })?.region}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Approval Progress</CardTitle></CardHeader>
            <CardContent>
              <ApprovalTimeline approvals={event.approvals as Approval[] ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Section({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className={`text-sm text-gray-700 whitespace-pre-wrap ${mono ? 'font-mono text-xs bg-gray-50 rounded-md p-3' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function SubmitButton({ eventId }: { eventId: string }) {
  return (
    <form action={async () => {
      'use server'
      const { createClient: createSC } = await import('@/lib/supabase/server')
      const supabase = await createSC()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('events').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        current_reviewer: 'events_team',
      }).eq('id', eventId).eq('created_by', user.id)
      const { redirect } = await import('next/navigation')
      redirect(`/dashboard/events/${eventId}`)
    }}>
      <Button size="sm" type="submit">Submit for Review</Button>
    </form>
  )
}

function CompleteButton({ eventId }: { eventId: string }) {
  return (
    <form action={async () => {
      'use server'
      const { createClient: createSC } = await import('@/lib/supabase/server')
      const supabase = await createSC()
      await supabase.from('events').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', eventId)
      const { redirect } = await import('next/navigation')
      redirect(`/dashboard/events/${eventId}`)
    }}>
      <Button size="sm" variant="outline" type="submit">Mark as Completed</Button>
    </form>
  )
}

function ArchiveButton({ eventId }: { eventId: string }) {
  return (
    <form action={async () => {
      'use server'
      const { createClient: createSC } = await import('@/lib/supabase/server')
      const supabase = await createSC()
      await supabase.from('events').update({
        status: 'archived',
        current_reviewer: null,
      }).eq('id', eventId)
      const { redirect } = await import('next/navigation')
      redirect(`/dashboard/events/${eventId}`)
    }}>
      <Button size="sm" variant="outline" type="submit">Archive Event</Button>
    </form>
  )
}
