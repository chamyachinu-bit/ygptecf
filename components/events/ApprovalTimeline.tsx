import { Check, X, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/formatters'
import { ROLE_LABELS } from '@/lib/utils/permissions'
import type { Approval } from '@/types/database'

interface ApprovalTimelineProps {
  approvals: Approval[]
}

const STAGES = [
  { role: 'events_team' as const, label: 'Events Team Review' },
  { role: 'finance_team' as const, label: 'Finance Team Review' },
  { role: 'accounts_team' as const, label: 'Accounts Team / Fund Release' },
]

export function ApprovalTimeline({ approvals }: ApprovalTimelineProps) {
  return (
    <div className="space-y-4">
      {STAGES.map((stage, index) => {
        const approval = approvals.find((a) => a.stage === stage.role)
        const isPending = !approval
        const isApproved = approval?.decision === 'approved'
        const isRejected = approval?.decision === 'rejected'
        const isOnHold = approval?.decision === 'on_hold'

        return (
          <div key={stage.role} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${isApproved ? 'bg-green-100 text-green-600' :
                  isRejected ? 'bg-red-100 text-red-600' :
                  isOnHold ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-400'}`}>
                {isApproved ? <Check className="w-4 h-4" /> :
                 isRejected ? <X className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
              </div>
              {index < STAGES.length - 1 && (
                <div className={`w-0.5 flex-1 mt-2 ${isApproved ? 'bg-green-200' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="pb-6 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{stage.label}</p>
              {approval ? (
                <>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {approval.profiles?.full_name} · {formatDateTime(approval.decided_at)}
                  </p>
                  {approval.comments && (
                    <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded p-2">
                      "{approval.comments}"
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Awaiting review</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
