import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Users, FileText, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/events/StatusBadge'
import { ApprovalTimeline } from '@/components/events/ApprovalTimeline'
import { BudgetLineItems } from '@/components/events/BudgetLineItems'
import { formatDate, formatRelative } from '@/lib/utils/formatters'
import { ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import type { Event, Approval, Budget, EventFile } from '@/types/database'

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
      approvals(*, profiles:reviewer_id(full_name, role)),
      files(*)
    `)
    .eq('id', id)
    .single()

  if (!event) notFound()

  const reviewableStatuses = profile?.role ? ROLE_REVIEWABLE_STATUSES[profile.role as keyof typeof ROLE_REVIEWABLE_STATUSES] : undefined
  const canApprove = profile &&
    reviewableStatuses?.includes(event.status) &&
    !event.approvals?.some((a: Approval) => a.stage === profile.role)

  const canSubmit = event.status === 'draft' && event.created_by === user.id
  const canComplete = event.status === 'funded' &&
    (event.created_by === user.id || profile?.role === 'admin')
  const canReport = event.status === 'completed' && event.created_by === user.id

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
            <h1 className="text-lg font-semibold">{event.title}</h1>
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
          {canComplete && (
            <CompleteButton eventId={id} />
          )}
          {canReport && (
            <Link href={`/dashboard/events/${id}/report`}>
              <Button size="sm" variant="outline">Submit Report</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {event.description && (
                <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {formatDate(event.event_date)}
                    {event.event_end_date && ` → ${formatDate(event.event_end_date)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{event.expected_attendees} expected attendees</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400 text-xs">Region:</span>
                  <span>{event.region}</span>
                </div>
              </div>
              {event.is_budget_flagged && event.flag_reason && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700">
                  ⚠ {event.flag_reason}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader><CardTitle>Budget Breakdown</CardTitle></CardHeader>
            <CardContent>
              <BudgetLineItems
                items={event.budgets as Budget[] ?? []}
                onChange={() => {}}
                readOnly
              />
            </CardContent>
          </Card>

          {/* Files */}
          {event.files && event.files.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Uploaded Files</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(event.files as EventFile[]).map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm flex-1">{file.file_name}</span>
                    <span className="text-xs text-gray-400">{file.file_type}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Submitted by */}
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

          {/* Approval Timeline */}
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

// Client action buttons
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
