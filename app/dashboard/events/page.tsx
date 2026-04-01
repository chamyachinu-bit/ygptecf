import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { EventCard } from '@/components/events/EventCard'
import { can, ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import type { Event } from '@/types/database'

export default async function EventsPage() {
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {actionableEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </SectionBlock>
        )}

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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </SectionBlock>
      </PageShell>
    </div>
  )
}
