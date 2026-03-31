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
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
              {event.profiles && (
                <p className="text-xs text-gray-500 mt-0.5">
                  by {event.profiles.full_name}
                </p>
              )}
            </div>
            <StatusBadge status={event.status} flagged={event.is_budget_flagged} />
          </div>

          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span>{event.expected_attendees} expected attendees</span>
            </div>
          </div>

          {totalBudget > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Estimated Budget</span>
              <span className={`text-sm font-semibold ${event.is_budget_flagged ? 'text-orange-600' : 'text-gray-900'}`}>
                {event.is_budget_flagged && <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
                {formatCurrency(totalBudget)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
