import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { EventCard } from '@/components/events/EventCard'
import type { Event } from '@/types/database'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  if (profile?.role === 'regional_coordinator') {
    query = query.eq('created_by', user.id)
  } else if (profile?.role !== 'admin') {
    query = query.neq('status', 'draft')
  }

  const { data: eventsData } = await query
  const events = eventsData ?? []

  // Group by status
  const grouped = (events as Event[]).reduce<Record<string, Event[]>>((acc, e) => {
    if (!acc[e.status]) acc[e.status] = []
    acc[e.status].push(e)
    return acc
  }, {})

  return (
    <div>
      <Header title="Events" />
      <div className="p-6 space-y-8">
        {/* Action needed section */}
        {profile?.role !== 'regional_coordinator' && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Action Required
              {(grouped['submitted']?.length || 0) +
               (grouped['events_approved']?.length || 0) +
               (grouped['finance_approved']?.length || 0) > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  {(grouped['submitted']?.length || 0) +
                   (grouped['events_approved']?.length || 0) +
                   (grouped['finance_approved']?.length || 0)}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                ...(grouped['submitted'] || []),
                ...(grouped['events_approved'] || []),
                ...(grouped['finance_approved'] || []),
              ].map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {[
                ...(grouped['submitted'] || []),
                ...(grouped['events_approved'] || []),
                ...(grouped['finance_approved'] || []),
              ].length === 0 && (
                <p className="text-sm text-gray-500 col-span-3">No events require action.</p>
              )}
            </div>
          </div>
        )}

        {/* All events */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            All Events ({events.length})
          </h2>
          {events.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="mb-2">No events found.</p>
              {profile?.role === 'regional_coordinator' && (
                <a href="/dashboard/events/new" className="text-green-600 hover:underline text-sm">
                  Create your first event proposal →
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(events as Event[]).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
