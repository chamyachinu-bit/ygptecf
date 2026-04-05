import Link from 'next/link'
import { Calendar, MapPin, Users, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from './StatusBadge'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'
import type { Event } from '@/types/database'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const totalBudget = event.budgets?.reduce((sum, b) => sum + b.estimated_amount, 0) ?? 0

  return (
    <Link href={`/dashboard/events/${event.id}`}>
      <Card className="group h-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">{event.event_code}</p>
              <h3 className="line-clamp-2 text-base font-semibold app-text-strong">{event.title}</h3>
              {event.profiles && (
                <p className="app-text-subtle mt-1 text-xs">
                  by {event.profiles.full_name}
                </p>
              )}
            </div>
            <StatusBadge status={event.status} flagged={event.is_budget_flagged} />
          </div>

          <div className="app-text-muted space-y-2 text-sm">
            <div className="app-panel-soft flex items-center gap-2 rounded-xl px-3 py-2">
              <Calendar className="app-text-subtle h-3.5 w-3.5" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <div className="app-panel-soft flex items-center gap-2 rounded-xl px-3 py-2">
              <MapPin className="app-text-subtle h-3.5 w-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="app-panel-soft flex items-center gap-2 rounded-xl px-3 py-2">
              <Users className="app-text-subtle h-3.5 w-3.5" />
              <span>{event.expected_attendees} expected attendees</span>
            </div>
          </div>

          {totalBudget > 0 && (
            <div className="app-panel-soft mt-4 flex items-center justify-between rounded-2xl px-4 py-3">
              <span className="app-text-subtle text-xs font-semibold uppercase tracking-[0.12em]">Estimated Budget</span>
              <span className={`text-sm font-semibold ${event.is_budget_flagged ? 'text-amber-600 dark:text-amber-200' : 'app-text-strong'}`}>
                {event.is_budget_flagged && <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
                {formatCurrency(totalBudget)}
              </span>
            </div>
          )}

          <div className="app-text-subtle mt-4 flex items-center justify-between text-xs font-medium">
            <span>{event.region}</span>
            <span className="text-emerald-600 transition-transform group-hover:translate-x-0.5 dark:text-emerald-300">Open event</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
