import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/events/StatusBadge'
import { formatDateTime } from '@/lib/utils/formatters'
import { ROLE_LABELS } from '@/lib/utils/permissions'
import type { AuditLog, EventStatus, Profile } from '@/types/database'

type AuditLogWithRelations = AuditLog & {
  events?: {
    id: string
    event_code: string | null
    title: string
    status: EventStatus
    region: string
    created_by: string
  } | null
  profiles?: Profile | null
}

function prettyAction(action: string) {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: logsData } = await supabase
    .from('audit_logs')
    .select(`
      *,
      events:event_id(id, event_code, title, status, region, created_by),
      profiles:user_id(id, full_name, email, role, region, phone, avatar_url, is_active, created_at, updated_at)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const logs = (logsData ?? []) as AuditLogWithRelations[]
  const historyTitle =
    profile.role === 'regional_coordinator'
      ? 'My Event History'
      : 'All Event History'

  return (
    <div>
      <Header title={historyTitle} />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{historyTitle}</CardTitle>
            <p className="text-sm text-gray-500">
              {profile.role === 'regional_coordinator'
                ? 'You can only see audit activity for events created by your account.'
                : 'Admin and reviewer roles can monitor audit activity across the full workflow.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">No history entries found yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {log.events ? (
                          <Link href={`/dashboard/events/${log.events.id}`} className="font-semibold text-green-700 hover:underline">
                            {(log.events.event_code ? `${log.events.event_code} · ` : '') + log.events.title}
                          </Link>
                        ) : (
                          <p className="font-semibold text-gray-900">System Activity</p>
                        )}
                        {log.events && <StatusBadge status={log.events.status} />}
                      </div>

                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{prettyAction(log.action)}</span>
                        {log.profiles?.full_name ? ` by ${log.profiles.full_name}` : ''}
                        {log.profiles?.role ? ` (${ROLE_LABELS[log.profiles.role]})` : ''}
                      </p>

                      {log.events?.region && (
                        <p className="text-xs text-gray-500">Region: {log.events.region}</p>
                      )}

                      {log.new_value && (
                        <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">
{JSON.stringify(log.new_value, null, 2)}
                        </pre>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
