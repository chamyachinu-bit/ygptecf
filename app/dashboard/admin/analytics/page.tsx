import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventsChart } from '@/components/dashboard/EventsChart'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Event } from '@/types/database'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: eventsData } = await supabase
    .from('events')
    .select('*, budgets(*)')
    .order('created_at', { ascending: false })

  const events = eventsData ?? []
  const totalBudget = (events as Event[]).reduce((sum, e) =>
    sum + (e.budgets?.reduce((s, b) => s + b.estimated_amount, 0) ?? 0), 0
  )
  const flagged = (events as Event[]).filter(e => e.is_budget_flagged).length
  const completionRate = events.length > 0
    ? Math.round(((events as Event[]).filter(e => e.status === 'completed').length / events.length) * 100)
    : 0

  const avgBudget = events.length > 0 ? totalBudget / events.length : 0

  const summaryStats = [
    { label: 'Total Events', value: events.length },
    { label: 'Completion Rate', value: `${completionRate}%` },
    { label: 'Flagged Budgets', value: flagged },
    { label: 'Avg. Event Budget', value: formatCurrency(avgBudget) },
    { label: 'Total Budget Committed', value: formatCurrency(totalBudget) },
    {
      label: 'Events This Month', value: (events as Event[]).filter(e => {
        const d = new Date(e.created_at)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length
    },
  ]

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">System-wide overview</p>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {summaryStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <EventsChart events={events as Event[]} />
      </div>
    </div>
  )
}
