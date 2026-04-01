import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/events/StatusBadge'
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import { formatDateTime } from '@/lib/utils/formatters'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import type { AuditLog, EventStatus, Profile } from '@/types/database'

type SearchParams = {
  search?: string
  action?: string
  status?: string
  actor_role?: string
  from?: string
  to?: string
}

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

const LIGHT_ACTIONS = new Set([
  'status_changed',
  'approval_revised',
  'proposal_updated',
  'budget_updated',
  'file_uploaded',
  'invoice_uploaded',
  'event_report_submitted',
])

function prettyAction(action: string) {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  const { data: logsData } = await supabase
    .from('audit_logs')
    .select(`
      *,
      events:event_id(id, event_code, title, status, region, created_by),
      profiles:user_id(id, full_name, email, role, region, phone, avatar_url, is_active, created_at, updated_at, approval_status)
    `)
    .order('created_at', { ascending: false })
    .limit(300)

  const rawLogs = (logsData ?? []) as AuditLogWithRelations[]
  const baseLogs = profile.role === 'admin'
    ? rawLogs
    : profile.role === 'regional_coordinator'
      ? rawLogs.filter((log) => log.events?.created_by === user.id)
      : rawLogs.filter((log) => LIGHT_ACTIONS.has(log.action))

  const logs = baseLogs.filter((log) => {
    const haystack = `${log.events?.event_code ?? ''} ${log.events?.title ?? ''} ${log.events?.region ?? ''} ${log.profiles?.full_name ?? ''}`.toLowerCase()
    const matchesSearch = !filters.search || haystack.includes(filters.search.toLowerCase())
    const matchesAction = !filters.action || log.action === filters.action
    const matchesStatus = !filters.status || log.events?.status === filters.status
    const matchesRole = !filters.actor_role || log.profiles?.role === filters.actor_role
    const createdAt = new Date(log.created_at)
    const matchesFrom = !filters.from || createdAt >= new Date(`${filters.from}T00:00:00`)
    const matchesTo = !filters.to || createdAt <= new Date(`${filters.to}T23:59:59`)
    return matchesSearch && matchesAction && matchesStatus && matchesRole && matchesFrom && matchesTo
  })

  const historyTitle =
    profile.role === 'regional_coordinator'
      ? 'My Event History'
      : profile.role === 'admin'
        ? 'System Audit History'
        : 'Workflow History'

  const stats = [
    { label: 'Entries', value: String(logs.length), helper: 'Current filtered result set' },
    { label: 'Proposal edits', value: String(logs.filter((log) => log.action === 'proposal_updated').length), helper: 'Detected proposal changes' },
    { label: 'Status shifts', value: String(logs.filter((log) => log.action === 'status_changed').length), helper: 'Workflow stage movement' },
    { label: 'File actions', value: String(logs.filter((log) => ['file_uploaded', 'invoice_uploaded'].includes(log.action)).length), helper: 'Document and invoice activity' },
  ]

  return (
    <div>
      <Header
        title={historyTitle}
        subtitle={
          profile.role === 'admin'
            ? 'Deep audit visibility across the system, with filters for actions, actors, event status, and date windows.'
            : profile.role === 'regional_coordinator'
              ? 'A focused audit trail for your own events, reports, workflow changes, and proposal edits.'
              : 'A lighter workflow history with the milestones and changes most relevant to your review role.'
        }
        eyebrow="Audit trail"
        canCreate={can(profile.role, 'events:create')}
      />
      <PageShell>
        <StatGrid>
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </StatGrid>

        <SectionBlock
          title="Filter history"
          subtitle="Search by event code, title, actor, status, or date range to narrow the audit trail."
        >
          <form className="grid gap-3 md:grid-cols-6">
            <input
              type="text"
              name="search"
              defaultValue={filters.search ?? ''}
              placeholder="Search event code or title"
              className="md:col-span-2 flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="text"
              name="action"
              defaultValue={filters.action ?? ''}
              placeholder="Action"
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="text"
              name="status"
              defaultValue={filters.status ?? ''}
              placeholder="Status"
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            {profile.role === 'admin' && (
              <input
                type="text"
                name="actor_role"
                defaultValue={filters.actor_role ?? ''}
                placeholder="Actor role"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            )}
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <input type="date" name="from" defaultValue={filters.from ?? ''} className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
              <input type="date" name="to" defaultValue={filters.to ?? ''} className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
            </div>
            <button className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-green-700 hover:to-emerald-700">
              Apply Filters
            </button>
          </form>
        </SectionBlock>

        <SectionBlock
          title={`History Results (${logs.length})`}
          subtitle="The result list below is optimized for traceability, with event context, actor metadata, and detailed admin payload visibility."
        >
          {logs.length === 0 ? (
            <EmptyState title="No history entries matched" message="Try broadening the date window or removing one of the more specific filters." />
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {log.events ? (
                          <Link href={`/dashboard/events/${log.events.id}`} className="font-semibold text-green-700 hover:underline">
                            {(log.events.event_code ? `${log.events.event_code} · ` : '') + log.events.title}
                          </Link>
                        ) : (
                          <p className="font-semibold text-slate-900">System Activity</p>
                        )}
                        {log.events && <StatusBadge status={log.events.status} />}
                      </div>

                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{prettyAction(log.action)}</span>
                        {log.profiles?.full_name ? ` by ${log.profiles.full_name}` : ''}
                        {log.profiles?.role ? ` (${ROLE_LABELS[log.profiles.role]})` : ''}
                      </p>

                      {log.events?.region && (
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Region: {log.events.region}</p>
                      )}

                      {profile.role === 'admin' ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {log.old_value && (
                            <pre className="overflow-x-auto rounded-2xl bg-rose-50 p-4 text-xs text-rose-900 whitespace-pre-wrap">
{JSON.stringify(log.old_value, null, 2)}
                            </pre>
                          )}
                          {log.new_value && (
                            <pre className="overflow-x-auto rounded-2xl bg-green-50 p-4 text-xs text-green-900 whitespace-pre-wrap">
{JSON.stringify(log.new_value, null, 2)}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          {log.new_value?.status
                            ? `New status: ${String(log.new_value.status)}`
                            : log.new_value?.decision
                              ? `Decision: ${String(log.new_value.decision)}`
                              : 'Detailed payload is available to admin only.'}
                        </p>
                      )}
                    </div>

                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">{formatDateTime(log.created_at)}</p>
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
