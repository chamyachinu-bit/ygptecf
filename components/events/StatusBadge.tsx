import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/formatters'
import type { EventStatus } from '@/types/database'

interface StatusBadgeProps {
  status: EventStatus
  flagged?: boolean
}

export function StatusBadge({ status, flagged }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
        {STATUS_LABELS[status]}
      </span>
      {flagged && (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700">
          ⚠ Budget Flagged
        </span>
      )}
    </div>
  )
}
