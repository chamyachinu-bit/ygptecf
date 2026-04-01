import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/events/StatusBadge'
import { formatDate, formatRelative } from '@/lib/utils/formatters'

export default async function ArchivedEventsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: events } = await supabase
    .from('events')
    .select('id, event_code, title, region, status, event_date, created_at, drive_sync_status')
    .eq('status', 'archived')
    .order('updated_at', { ascending: false })

  return (
    <div>
      <Header title="Archived Events" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Archive Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Archived events remain readable with their report, comparison views, drive links, and audit history.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(events ?? []).map((event) => (
            <Card key={event.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{event.event_code}</p>
                    <p className="font-semibold text-gray-900">{event.title}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Region: {event.region}</p>
                  <p>Event date: {formatDate(event.event_date)}</p>
                  <p>Archived record age: {formatRelative(event.created_at)}</p>
                  <p>Drive status: {event.drive_sync_status || 'pending'}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/events/${event.id}`} className="text-sm font-medium text-green-700 hover:underline">
                    Open Event
                  </Link>
                  <Link href={`/dashboard/events/${event.id}/final-report`} className="text-sm font-medium text-green-700 hover:underline">
                    Final Report
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
