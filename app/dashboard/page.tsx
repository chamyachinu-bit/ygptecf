import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { EventsChart } from '@/components/dashboard/EventsChart'
import { EventCard } from '@/components/events/EventCard'
import type { DashboardStats, Event } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch events based on role
  let eventsQuery = supabase
    .from('events')
    .select('*, profiles:created_by(full_name, email), budgets(*)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (profile?.role === 'regional_coordinator') {
    eventsQuery = eventsQuery.eq('created_by', user.id)
  } else if (profile?.role !== 'admin') {
    eventsQuery = eventsQuery.neq('status', 'draft')
  }

  const { data: eventsData } = await eventsQuery
  const events = eventsData ?? []

  // Calculate stats
  const stats: DashboardStats = {
    total_events: events.length,
    pending_approval: events.filter(e =>
      ['submitted', 'events_approved', 'finance_approved'].includes(e.status)
    ).length,
    funded_events: events.filter(e => e.status === 'funded').length,
    completed_events: events.filter(e => e.status === 'completed').length,
    total_budget_estimated: events.reduce((sum, e) =>
      sum + (e.budgets?.reduce((s: number, b: { estimated_amount: number }) => s + b.estimated_amount, 0) ?? 0), 0
    ),
    total_budget_actual: 0,
  }

  // Recent events (last 5)
  const recentEvents = (events as Event[]).slice(0, 5)

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <StatsCards stats={stats} />
        <EventsChart events={events as Event[]} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Events</h2>
            <a href="/dashboard/events" className="text-sm text-green-600 hover:underline">
              View all →
            </a>
          </div>
          {recentEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No events yet.</p>
              {profile?.role === 'regional_coordinator' && (
                <a href="/dashboard/events/new" className="text-green-600 hover:underline text-sm mt-2 inline-block">
                  Create your first event proposal →
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentEvents.map((event) => (
                <EventCard key={event.id} event={event as Event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
