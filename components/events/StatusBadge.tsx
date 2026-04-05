import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/formatters'
import type { EventStatus } from '@/types/database'

interface StatusBadgeProps {
  status: EventStatus
  flagged?: boolean
}

export function StatusBadge({ status, flagged }: StatusBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${STATUS_COLORS[status]}`}>
        {STATUS_LABELS[status]}
      </span>
      {flagged && (
        <span className="app-warning-soft inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
          Budget Flagged
        </span>
      )}
    </div>
  )
}
