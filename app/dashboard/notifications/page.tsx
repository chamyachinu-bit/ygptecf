'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/utils/formatters'
import { Bell, CheckCheck, AlertTriangle, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import type { NotificationType } from '@/types/database'

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  approval_required: <Calendar className="w-4 h-4 text-blue-500" />,
  status_changed: <CheckCheck className="w-4 h-4 text-green-500" />,
  budget_flagged: <DollarSign className="w-4 h-4 text-orange-500" />,
  event_reminder: <Bell className="w-4 h-4 text-purple-500" />,
  report_due: <AlertTriangle className="w-4 h-4 text-red-500" />,
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  const { notifications, markRead, markAllRead } = useNotifications(userId)

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>
      <div className="p-6 max-w-2xl mx-auto space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No unread notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{TYPE_ICONS[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{formatRelative(n.created_at)}</span>
                      {n.event_id && (
                        <Link
                          href={`/dashboard/events/${n.event_id}`}
                          className="text-xs text-green-600 hover:underline"
                        >
                          View Event →
                        </Link>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
