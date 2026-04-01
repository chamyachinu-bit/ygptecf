'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Event } from '@/types/database'
import { STATUS_LABELS } from '@/lib/utils/formatters'

interface EventsChartProps {
  events: Event[]
}

const STATUS_CHART_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  submitted: '#3b82f6',
  events_approved: '#a855f7',
  finance_approved: '#6366f1',
  funded: '#22c55e',
  rejected: '#ef4444',
  on_hold: '#f59e0b',
  completed: '#10b981',
  archived: '#d1d5db',
}

export function EventsChart({ events }: EventsChartProps) {
  // Count events by status
  const statusCounts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.status] = (acc[event.status] || 0) + 1
    return acc
  }, {})

  const data = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
      count,
      status,
    }))

  // Budget by region
  const regionBudgets = events.reduce<Record<string, number>>((acc, event) => {
    const total = event.budgets?.reduce((s, b) => s + b.estimated_amount, 0) ?? 0
    acc[event.region] = (acc[event.region] || 0) + total
    return acc
  }, {})

  const regionData = Object.entries(regionBudgets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([region, budget]) => ({ region, budget }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_CHART_COLORS[entry.status] || '#6b7280'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget by Region (INR)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Budget']} />
              <Bar dataKey="budget" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
