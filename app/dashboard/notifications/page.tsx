'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Bell, Calendar, CheckCheck, AlertTriangle, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { formatRelative } from '@/lib/utils/formatters'
import { ROLE_LABELS } from '@/lib/utils/permissions'
import type { NotificationType, Profile } from '@/types/database'

const TYPE_ICONS: Record<NotificationType, ReactNode> = {
  approval_required: <Calendar className="h-4 w-4 text-blue-500" />,
  status_changed: <CheckCheck className="h-4 w-4 text-green-500" />,
  budget_flagged: <DollarSign className="h-4 w-4 text-orange-500" />,
  event_reminder: <Bell className="h-4 w-4 text-violet-500" />,
  report_due: <AlertTriangle className="h-4 w-4 text-red-500" />,
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserId(user?.id ?? null)
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile((data as Profile | null) ?? null)
    })
  }, [supabase])

  const { notifications, markRead, markAllRead } = useNotifications(userId)
  const role = profile?.role ?? 'regional_coordinator'
  const warningTypes: NotificationType[] =
    role === 'finance_team' || role === 'accounts_team' || role === 'admin' || role === 'bot'
      ? ['budget_flagged', 'report_due']
      : ['report_due', 'event_reminder']

  const approvalLabel =
    role === 'designer'
      ? 'Creative Requests'
      : role === 'social_media_team'
        ? 'Content Requests'
        : 'Approvals'

  const movementLabel =
    role === 'designer'
      ? 'Flyer Updates'
      : role === 'social_media_team'
        ? 'Workflow Updates'
        : 'Status Changes'

  const warningLabel =
    role === 'finance_team' || role === 'accounts_team' || role === 'admin' || role === 'bot'
      ? 'Warnings'
      : 'Reminders'

  const stats = [
    { label: 'Unread', value: String(notifications.length), helper: 'Current inbox items' },
    {
      label: approvalLabel,
      value: String(notifications.filter((item) => item.type === 'approval_required').length),
      helper:
        role === 'designer'
          ? 'Flyer intake and approvals'
          : role === 'social_media_team'
            ? 'Content and documentation intake'
            : 'Review-related updates',
    },
    {
      label: movementLabel,
      value: String(notifications.filter((item) => item.type === 'status_changed').length),
      helper: 'Workflow movement alerts',
    },
    {
      label: warningLabel,
      value: String(notifications.filter((item) => warningTypes.includes(item.type)).length),
      helper:
        role === 'designer' || role === 'social_media_team'
          ? 'Follow-up items worth revisiting'
          : 'Items worth immediate attention',
    },
  ]

  const subtitle =
    role === 'designer'
      ? 'Track flyer requests, approval movement, and release updates from one focused creative inbox.'
      : role === 'social_media_team'
        ? 'Track post-event content requests, documentation handoffs, and completion updates from one focused social inbox.'
        : `Stay on top of approvals, status updates, reporting deadlines, and workflow alerts from one ${profile ? ROLE_LABELS[role].toLowerCase() : 'executive'} inbox.`

  function getOpenLabel(type: NotificationType, linkPath?: string | null) {
    if (linkPath?.includes('/dashboard/flyer-requests')) return 'Open flyer workflow →'
    if (linkPath?.includes('/dashboard/social-workflow')) return 'Open social workflow →'
    if (type === 'approval_required') return 'Open request →'
    if (type === 'report_due') return 'Open reporting →'
    return 'Open item →'
  }

  return (
    <div>
      <Header
        title="Notifications"
        subtitle={subtitle}
        eyebrow="Inbox"
      />
      <PageShell>
        <StatGrid>
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </StatGrid>

        <SectionBlock
          title="Notification inbox"
          subtitle="Unread items are kept here until you dismiss them or mark the full inbox as read."
          actions={
            notifications.length > 0 ? (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            ) : undefined
          }
        >
          {notifications.length === 0 ? (
            <EmptyState
              title="No unread notifications"
              message="Your inbox is clear. Workflow updates, approval requests, and deadline reminders will appear here automatically."
            />
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                      {TYPE_ICONS[notification.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                        </div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{formatRelative(notification.created_at)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {(notification.link_path || notification.event_id) && (
                          <Link
                            href={notification.link_path || `/dashboard/events/${notification.event_id}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-slate-100"
                          >
                            {getOpenLabel(notification.type, notification.link_path)}
                          </Link>
                        )}
                        <button
                          onClick={() => markRead(notification.id)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionBlock>
      </PageShell>
    </div>
  )
}
