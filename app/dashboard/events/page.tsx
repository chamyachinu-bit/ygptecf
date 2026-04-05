import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { EventCard } from '@/components/events/EventCard'
import { ResultNavigation } from '@/components/ui/result-navigation'
import { can, ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import type { Event } from '@/types/database'

type SearchParams = {
  all_q?: string
  all_size?: string
  all_page?: string
  queue_q?: string
  queue_size?: string
  queue_page?: string
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'designer') {
    redirect('/dashboard/flyer-requests')
  }

  if (profile?.role === 'social_media_team') {
    redirect('/dashboard/social-workflow')
  }

  let query = supabase
    .from('events')
    .select('*, profiles:created_by(full_name, email, region), budgets(*)')
    .order('created_at', { ascending: false })
    .neq('status', 'archived')

  if (profile?.role === 'regional_coordinator') {
    query = query.eq('created_by', user.id)
  } else if (profile?.role !== 'admin') {
    query = query.neq('status', 'draft')
  }

  const { data: eventsData } = await query
  const events = (eventsData ?? []) as Event[]
  const actionableStatuses = profile?.role ? (ROLE_REVIEWABLE_STATUSES[profile.role as keyof typeof ROLE_REVIEWABLE_STATUSES] ?? []) : []
  const actionableEvents = profile?.role === 'regional_coordinator'
    ? []
    : events.filter((event) => actionableStatuses.includes(event.status))
  const allQuery = (filters.all_q ?? '').trim().toLowerCase()
  const queueQuery = (filters.queue_q ?? '').trim().toLowerCase()
  const allSize = [10, 25, 50, 100].includes(Number(filters.all_size)) ? Number(filters.all_size) : 25
  const queueSize = [10, 25, 50, 100].includes(Number(filters.queue_size)) ? Number(filters.queue_size) : 10
  const allPage = Math.max(Number(filters.all_page ?? '1') || 1, 1)
  const queuePage = Math.max(Number(filters.queue_page ?? '1') || 1, 1)

  const filterEventCards = (collection: Event[], queryText: string) =>
    collection.filter((event) => {
      if (!queryText) return true
      const haystack = `${event.event_code ?? ''} ${event.title} ${event.region} ${event.goal ?? ''}`.toLowerCase()
      return haystack.includes(queryText)
    })

  const filteredAllEvents = filterEventCards(events, allQuery)
  const filteredActionableEvents = filterEventCards(actionableEvents, queueQuery)
  const safeAllPage = Math.min(allPage, Math.max(1, Math.ceil(filteredAllEvents.length / allSize)))
  const safeQueuePage = Math.min(queuePage, Math.max(1, Math.ceil(filteredActionableEvents.length / queueSize)))
  const visibleAllEvents = filteredAllEvents.slice((safeAllPage - 1) * allSize, safeAllPage * allSize)
  const visibleActionableEvents = filteredActionableEvents.slice((safeQueuePage - 1) * queueSize, safeQueuePage * queueSize)

  const stats = [
    { label: 'Visible Events', value: String(events.length), helper: 'Based on your current role visibility' },
    { label: 'Action Required', value: String(actionableEvents.length), helper: 'Events currently needing your attention' },
    { label: 'Funded', value: String(events.filter((event) => event.status === 'funded').length), helper: 'Approved for execution' },
    { label: 'Completed / Reported', value: String(events.filter((event) => ['completed', 'report_submitted'].includes(event.status)).length), helper: 'Reached the reporting phase' },
  ]

  return (
    <div>
      <Header
        title="Events Workspace"
        subtitle="Browse the event portfolio, focus on your active queue, and move quickly between proposals, approvals, reporting, and final review."
        eyebrow="Operations workspace"
        canCreate={can(profile?.role ?? 'regional_coordinator', 'events:create')}
      />
      <PageShell>
        <StatGrid>
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </StatGrid>

        {profile?.role !== 'regional_coordinator' && (
          <div id="action-required">
          <SectionBlock
            title="Action required"
            subtitle="These events are already at your stage and need review or follow-up now."
          >
            {actionableEvents.length === 0 ? (
              <EmptyState
                title="Your review queue is empty"
                message="No event currently needs your action. New events will appear here automatically when they reach your stage."
              />
            ) : (
              <div className="space-y-4">
                <form action="/dashboard/events#action-required" className="grid gap-3 md:grid-cols-[1.6fr_auto]">
                  <input type="hidden" name="all_q" value={filters.all_q ?? ''} />
                  <input type="hidden" name="all_size" value={String(allSize)} />
                  <input type="hidden" name="all_page" value={String(safeAllPage)} />
                  <input
                    type="text"
                    name="queue_q"
                    defaultValue={filters.queue_q ?? ''}
                    placeholder="Quick search queue by code, title, region, or goal"
                    className="app-field flex h-11 w-full rounded-xl px-4 py-2 text-sm"
                  />
                  <button className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700">
                    Search Queue
                  </button>
                </form>

                <ResultNavigation
                  pathname="/dashboard/events"
                  query={{
                    all_q: filters.all_q ?? '',
                    all_size: allSize,
                    all_page: safeAllPage,
                    queue_q: filters.queue_q ?? '',
                    queue_size: queueSize,
                    queue_page: safeQueuePage,
                  }}
                  sizeParam="queue_size"
                  pageParam="queue_page"
                  currentSize={queueSize}
                  currentPage={safeQueuePage}
                  totalCount={filteredActionableEvents.length}
                  label="Action Required"
                  anchorId="action-required"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleActionableEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                </div>
              </div>
            )}
          </SectionBlock>
          </div>
        )}

        <div id="visible-events">
        <SectionBlock
          title={profile?.role === 'regional_coordinator' ? 'My visible events' : 'All visible events'}
          subtitle="Use this space to scan the wider portfolio, open event records, and follow the workflow from proposal to reporting."
          actions={
            profile?.role === 'regional_coordinator' ? (
              <Link href="/dashboard/events/new" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-slate-50">
                Create new event
              </Link>
            ) : undefined
          }
        >
          {events.length === 0 ? (
            <EmptyState
              title="No events found"
              message={
                profile?.role === 'regional_coordinator'
                  ? 'Start your first event proposal and it will appear here as soon as you save it.'
                  : 'No events are currently visible in your workspace.'
              }
              action={
                profile?.role === 'regional_coordinator' ? (
                  <Link href="/dashboard/events/new" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-slate-50">
                    Start first proposal
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <form action="/dashboard/events#visible-events" className="grid gap-3 md:grid-cols-[1.6fr_auto]">
                {profile?.role !== 'regional_coordinator' && (
                  <>
                    <input type="hidden" name="queue_q" value={filters.queue_q ?? ''} />
                    <input type="hidden" name="queue_size" value={String(queueSize)} />
                    <input type="hidden" name="queue_page" value={String(safeQueuePage)} />
                  </>
                )}
                <input
                  type="text"
                  name="all_q"
                  defaultValue={filters.all_q ?? ''}
                  placeholder="Quick search event code, title, region, or goal"
                  className="app-field flex h-11 w-full rounded-xl px-4 py-2 text-sm"
                />
                <button className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700">
                  Search Events
                </button>
              </form>

              <ResultNavigation
                pathname="/dashboard/events"
                query={{
                  all_q: filters.all_q ?? '',
                  all_size: allSize,
                  all_page: safeAllPage,
                  queue_q: filters.queue_q ?? '',
                  queue_size: queueSize,
                  queue_page: safeQueuePage,
                }}
                sizeParam="all_size"
                pageParam="all_page"
                currentSize={allSize}
                currentPage={safeAllPage}
                totalCount={filteredAllEvents.length}
                label={profile?.role === 'regional_coordinator' ? 'My visible events' : 'All visible events'}
                anchorId="visible-events"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleAllEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              </div>
            </div>
          )}
        </SectionBlock>
        </div>
      </PageShell>
    </div>
  )
}
