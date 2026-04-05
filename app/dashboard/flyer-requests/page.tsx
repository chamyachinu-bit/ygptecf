import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, ExternalLink, MapPin, Palette, Target } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { FLYER_STATUSES, getFlyerWorkflowPath, prettyWorkflowStatus } from '@/lib/workflows/creative'
import { formatDate } from '@/lib/utils/formatters'
import type { Event, FlyerRequest, Profile } from '@/types/database'

type FlyerRow = {
  event: Event
  workflow: FlyerRequest | null
  creatorName: string | null
}

export default async function FlyerRequestsPage() {
  const supabase = await createClient()
  const service = await createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile) redirect('/login')
  if (profile.role !== 'designer') redirect('/dashboard')

  async function updateFlyerRequest(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const service = await createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const profile = profileData as Profile | null
    if (!profile || profile.role !== 'designer') redirect('/dashboard')

    const eventId = String(formData.get('event_id') || '')
    const status = String(formData.get('status') || 'requested') as FlyerRequest['status']
    const driveLink = String(formData.get('drive_link') || '').trim()
    const notes = String(formData.get('notes') || '').trim()

    if (!eventId) redirect(getFlyerWorkflowPath())
    if ((status === 'submitted' || status === 'approved' || status === 'released') && !driveLink) {
      redirect(`${getFlyerWorkflowPath()}?error=drive`)
    }

    const { data: event } = await service
      .from('events')
      .select('id, title, created_by')
      .eq('id', eventId)
      .single()

    if (!event) redirect(getFlyerWorkflowPath())

    const payload = {
      event_id: eventId,
      requested_by: event.created_by,
      assigned_designer: user.id,
      status,
      drive_link: driveLink || null,
      notes: notes || null,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      released_at: status === 'released' ? new Date().toISOString() : null,
    }

    await service.from('flyer_requests').upsert(payload, { onConflict: 'event_id' })

    await service.from('notifications').insert({
      user_id: event.created_by,
      event_id: eventId,
      link_path: getFlyerWorkflowPath(),
      type: 'status_changed',
      title: 'Flyer workflow updated',
      message: `Flyer workflow for "${event.title}" is now ${prettyWorkflowStatus(status)}.`,
    })

    redirect(`${getFlyerWorkflowPath()}?saved=flyer`)
  }

  const [{ data: eventsData }, { data: workflowsData }] = await Promise.all([
    service
      .from('events')
      .select('*, profiles:created_by(full_name)')
      .eq('social_media_required', true)
      .in('status', ['submitted', 'events_approved', 'finance_approved', 'funded', 'completed', 'report_submitted'])
      .order('event_date', { ascending: true }),
    service.from('flyer_requests').select('*').order('updated_at', { ascending: false }),
  ])

  const workflows = (workflowsData ?? []) as FlyerRequest[]
  const workflowByEvent = new Map(workflows.map((row) => [row.event_id, row]))
  const rows: FlyerRow[] = ((eventsData ?? []) as (Event & { profiles?: { full_name?: string } })[]).map((event) => ({
    event,
    workflow: workflowByEvent.get(event.id) ?? null,
    creatorName: event.profiles?.full_name ?? null,
  }))

  const stats = [
    { label: 'Flyer Requests', value: String(rows.length), helper: 'Events needing creative handling' },
    { label: 'Submitted', value: String(rows.filter((row) => row.workflow?.status === 'submitted').length), helper: 'Awaiting approval or release' },
    { label: 'Released', value: String(rows.filter((row) => row.workflow?.status === 'released').length), helper: 'Already shared back to the coordinator' },
    { label: 'In Progress', value: String(rows.filter((row) => ['requested', 'in_progress'].includes(row.workflow?.status ?? 'requested')).length), helper: 'Still being prepared' },
  ]

  return (
    <div>
      <Header
        title="Flyer Requests"
        subtitle="This is the only creative workspace for Designer. Handle flyer tasks here, add the Drive link, and move each request through submission and release."
        eyebrow="Designer workflow"
      />
      <PageShell>
        <StatGrid>
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </StatGrid>

        <SectionBlock
          title="Creative queue"
          subtitle="Only flyer-relevant events appear here. Generic events browsing, reports, analytics, and history are intentionally removed for this role."
        >
          {rows.length === 0 ? (
            <EmptyState
              title="No flyer requests in scope"
              message="Creative-ready events will appear here automatically once they are configured for social or flyer support."
            />
          ) : (
            <div className="space-y-4">
              {rows.map(({ event, workflow, creatorName }) => (
                <Card key={event.id} className="rounded-[1.5rem] border-slate-200/80">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{event.event_code}</p>
                        <CardTitle className="mt-2 text-lg">{event.title}</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">
                          Requested by {creatorName ?? 'Coordinator'} · {prettyWorkflowStatus(workflow?.status ?? 'requested')}
                        </p>
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Designer only
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <MiniInfo icon={<CalendarDays className="h-4 w-4" />} label="Date" value={formatDate(event.event_date)} />
                      <MiniInfo icon={<MapPin className="h-4 w-4" />} label="Venue" value={event.location} />
                      <MiniInfo icon={<Target className="h-4 w-4" />} label="Goal" value={event.goal || 'General event'} />
                      <MiniInfo icon={<Palette className="h-4 w-4" />} label="Channels" value={event.social_media_channels?.join(', ') || 'Not specified'} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Creative brief</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {event.social_media_requirements || event.social_media_caption || event.description || 'Use the event goal, title, date, and region to prepare the flyer.'}
                        </p>
                      </div>
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <a href={event.proposal_drive_url || '#'} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 text-sm font-medium ${event.proposal_drive_url ? 'text-green-700 hover:underline' : 'text-slate-400 pointer-events-none'}`}>
                          <ExternalLink className="h-4 w-4" />
                          Proposal folder
                        </a>
                        <a href={event.media_drive_url || '#'} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 text-sm font-medium ${event.media_drive_url ? 'text-green-700 hover:underline' : 'text-slate-400 pointer-events-none'}`}>
                          <ExternalLink className="h-4 w-4" />
                          Media folder
                        </a>
                        <Link href={`/dashboard/events/${event.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline">
                          <ExternalLink className="h-4 w-4" />
                          Open creative context
                        </Link>
                      </div>
                    </div>

                    <form action={updateFlyerRequest} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[0.7fr_1.3fr_auto]">
                      <input type="hidden" name="event_id" value={event.id} />
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</label>
                        <select
                          name="status"
                          defaultValue={workflow?.status ?? 'requested'}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          {FLYER_STATUSES.map((status) => (
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
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Submission Notes</label>
                          <input
                            type="text"
                            name="notes"
                            defaultValue={workflow?.notes ?? ''}
                            placeholder="Version, copy notes, handoff note"
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full">Save flyer update</Button>
                      </div>
                    </form>
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

function MiniInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
