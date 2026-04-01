import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventCard } from '@/components/events/EventCard'
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Event, Profile } from '@/types/database'

function sumEstimated(events: Event[]) {
  return events.reduce((sum, event) => sum + (event.budgets?.reduce((lineSum, line) => lineSum + line.estimated_amount, 0) ?? 0), 0)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  let eventsQuery = supabase
    .from('events')
    .select('*, profiles:created_by(full_name, email), budgets(*)')
    .order('created_at', { ascending: false })
    .limit(60)

  if (profile.role === 'regional_coordinator') {
    eventsQuery = eventsQuery.eq('created_by', user.id)
  } else if (profile.role !== 'admin') {
    eventsQuery = eventsQuery.neq('status', 'draft')
  }

  const { data: eventsData } = await eventsQuery
  const events = (eventsData ?? []) as Event[]
  const canCreate = can(profile.role, 'events:create')

  const myDrafts = events.filter((event) => event.status === 'draft')
  const mySubmitted = events.filter((event) => ['submitted', 'events_approved', 'finance_approved', 'funded', 'on_hold', 'rejected'].includes(event.status))
  const reportsPending = events.filter((event) => event.status === 'completed')

  const reviewQueue = events.filter((event) =>
    (profile.role === 'events_team' && event.status === 'submitted') ||
    (profile.role === 'finance_team' && event.status === 'events_approved') ||
    (profile.role === 'accounts_team' && event.status === 'finance_approved') ||
    (profile.role === 'admin' && ['submitted', 'events_approved', 'finance_approved', 'on_hold', 'rejected'].includes(event.status))
  )

  const title =
    profile.role === 'regional_coordinator'
      ? 'Regional Coordinator Dashboard'
      : profile.role === 'events_team'
        ? 'Events Team Dashboard'
        : profile.role === 'finance_team'
          ? 'Finance Team Dashboard'
          : profile.role === 'accounts_team'
            ? 'Accounts Team Dashboard'
            : 'Admin Dashboard'

  const summaryCards =
    profile.role === 'regional_coordinator'
      ? [
          { label: 'My Drafts', value: myDrafts.length.toString() },
          { label: 'In Workflow', value: mySubmitted.length.toString() },
          { label: 'Completion Reports Due', value: reportsPending.length.toString() },
          { label: 'Planned Budget', value: formatCurrency(sumEstimated(events)) },
        ]
      : profile.role === 'events_team'
        ? [
            { label: 'Submitted Queue', value: events.filter((event) => event.status === 'submitted').length.toString() },
            { label: 'My Review Queue', value: reviewQueue.length.toString() },
            { label: 'Events Created', value: events.filter((event) => event.created_by === user.id).length.toString() },
            { label: 'Budget in Queue', value: formatCurrency(sumEstimated(reviewQueue)) },
          ]
        : profile.role === 'finance_team'
          ? [
              { label: 'Finance Queue', value: reviewQueue.length.toString() },
              { label: 'Approved by Events', value: events.filter((event) => event.status === 'events_approved').length.toString() },
              { label: 'Budget in Queue', value: formatCurrency(sumEstimated(reviewQueue)) },
              { label: 'Funded Events', value: events.filter((event) => event.status === 'funded').length.toString() },
            ]
          : profile.role === 'accounts_team'
            ? [
                { label: 'Accounts Queue', value: reviewQueue.length.toString() },
                { label: 'Finance Approved', value: events.filter((event) => event.status === 'finance_approved').length.toString() },
                { label: 'Funded', value: events.filter((event) => event.status === 'funded').length.toString() },
                { label: 'Budget in Queue', value: formatCurrency(sumEstimated(reviewQueue)) },
              ]
            : [
                { label: 'Total Events', value: events.length.toString() },
                { label: 'Open Review Items', value: reviewQueue.length.toString() },
                { label: 'Completed Events', value: events.filter((event) => event.status === 'completed' || event.status === 'report_submitted').length.toString() },
                { label: 'Total Planned Budget', value: formatCurrency(sumEstimated(events)) },
              ]

  return (
    <div>
      <Header title={title} canCreate={canCreate} />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Signed in as <strong>{ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS]}</strong>. This dashboard highlights the work most relevant to your role.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-5">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {profile.role === 'regional_coordinator'
                ? 'My Events'
                : profile.role === 'admin'
                  ? 'System Review Queue'
                  : 'My Review Queue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(profile.role === 'regional_coordinator' ? events : reviewQueue).length === 0 ? (
              <p className="text-sm text-gray-500">No events to show right now.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(profile.role === 'regional_coordinator' ? events.slice(0, 6) : reviewQueue.slice(0, 6)).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {profile.role === 'accounts_team' && (
          <Card>
            <CardHeader>
              <CardTitle>Accounts Review Focus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>Review finance-approved events only.</p>
              <p>Use the event detail page to inspect cost breakdown, actuals, and invoice uploads before final release approval.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Link href="/dashboard/events" className="text-sm text-green-600 hover:underline">
            Open full events workspace →
          </Link>
        </div>
      </div>
    </div>
  )
}
