import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { EventCard } from '@/components/events/EventCard'
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import { formatCurrency } from '@/lib/utils/formatters'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import type { Event, Profile } from '@/types/database'

function sumEstimated(events: Event[]) {
  return events.reduce((sum, event) => sum + (event.budgets?.reduce((lineSum, line) => lineSum + line.estimated_amount, 0) ?? 0), 0)
}

const ROLE_DASHBOARD_COPY = {
  regional_coordinator: {
    title: 'Regional Coordinator Dashboard',
    queueTitle: 'My event pipeline',
    queueSubtitle: 'Track your event journey from draft creation to final reporting.',
    emptyMessage: 'Your event list is clear. Drafts, submissions, and completion tasks will appear here when they need action.',
    summaryCards: (events: Event[], _reviewQueue: Event[]) => {
      const myDrafts = events.filter((event) => event.status === 'draft')
      const mySubmitted = events.filter((event) => ['submitted', 'events_approved', 'finance_approved', 'funded', 'on_hold', 'rejected'].includes(event.status))
      const reportsPending = events.filter((event) => event.status === 'completed')
      return [
        { label: 'My Drafts', value: myDrafts.length.toString(), helper: 'Proposals still being shaped' },
        { label: 'In Workflow', value: mySubmitted.length.toString(), helper: 'Events moving through review' },
        { label: 'Reports Due', value: reportsPending.length.toString(), helper: 'Completed events awaiting ECR' },
        { label: 'Planned Budget', value: formatCurrency(sumEstimated(events)), helper: 'Across your visible events' },
      ]
    },
    focusCards: [
      { title: 'Proposal readiness', body: 'Use the event editor to strengthen scope, logistics, budget quality, and social/media requirements before submission.' },
      { title: 'Workflow follow-up', body: 'Respond quickly to holds, rejections, or revision requests to keep approvals moving.' },
      { title: 'Completion reporting', body: 'Once funded and completed, capture actual outcomes and spending clearly so the final report is stakeholder-ready.' },
    ],
  },
  events_team: {
    title: 'Events Team Dashboard',
    queueTitle: 'My review queue',
    queueSubtitle: 'These events currently require action from your role.',
    emptyMessage: 'Your review queue is empty right now. New items will appear here when they reach your approval stage.',
    summaryCards: (events: Event[], reviewQueue: Event[], userId?: string) => [
      { label: 'Submitted Queue', value: events.filter((event) => event.status === 'submitted').length.toString(), helper: 'New proposals awaiting Events review' },
      { label: 'My Review Queue', value: reviewQueue.length.toString(), helper: 'Items needing immediate action' },
      { label: 'Events Created', value: events.filter((event) => event.created_by === userId).length.toString(), helper: 'Your own proposals still visible here' },
      { label: 'Budget In Queue', value: formatCurrency(sumEstimated(reviewQueue)), helper: 'Total proposed budget under review' },
    ],
    focusCards: [
      { title: 'Proposal clarity', body: 'Focus on objective fit, venue readiness, participant suitability, and execution feasibility.' },
      { title: 'First-stage review', body: 'Approve only when the event has enough operational clarity to move confidently into finance review.' },
      { title: 'Visible next steps', body: 'Use the event detail and review workspace to understand what changed and what still needs attention.' },
    ],
  },
  finance_team: {
    title: 'Finance Team Dashboard',
    queueTitle: 'My review queue',
    queueSubtitle: 'These events currently require action from your role.',
    emptyMessage: 'Your review queue is empty right now. New items will appear here when they reach your approval stage.',
    summaryCards: (events: Event[], reviewQueue: Event[]) => [
      { label: 'Finance Queue', value: reviewQueue.length.toString(), helper: 'Items awaiting finance review' },
      { label: 'Events Approved', value: events.filter((event) => event.status === 'events_approved').length.toString(), helper: 'Cleared by Events team' },
      { label: 'Budget In Queue', value: formatCurrency(sumEstimated(reviewQueue)), helper: 'Funding scope currently under review' },
      { label: 'Funded Events', value: events.filter((event) => event.status === 'funded').length.toString(), helper: 'Already approved for funding' },
    ],
    focusCards: [
      { title: 'Budget logic', body: 'Review proposed budgets against scope, event size, and expected delivery complexity.' },
      { title: 'Funding discipline', body: 'Look for overspend risk, weak justification, or donation assumptions that need clearer backing.' },
      { title: 'Decision confidence', body: 'Use report and event details to understand whether the financial structure is realistic and defensible.' },
    ],
  },
  accounts_team: {
    title: 'Accounts Team Dashboard',
    queueTitle: 'My review queue',
    queueSubtitle: 'These events currently require action from your role.',
    emptyMessage: 'Your review queue is empty right now. New items will appear here when they reach your approval stage.',
    summaryCards: (events: Event[], reviewQueue: Event[]) => [
      { label: 'Accounts Queue', value: reviewQueue.length.toString(), helper: 'Finance-approved events needing release review' },
      { label: 'Finance Approved', value: events.filter((event) => event.status === 'finance_approved').length.toString(), helper: 'Ready for Accounts attention' },
      { label: 'Funded', value: events.filter((event) => event.status === 'funded').length.toString(), helper: 'Cleared for release' },
      { label: 'Budget In Queue', value: formatCurrency(sumEstimated(reviewQueue)), helper: 'Financial exposure in the queue' },
    ],
    focusCards: [
      { title: 'Release readiness', body: 'Review only finance-approved items and make sure the numbers and support materials are release-ready.' },
      { title: 'Variance review', body: 'Use the event page and final report to compare planned vs actual cost patterns before final release.' },
      { title: 'Support documents', body: 'Drive-linked invoice, report, and media folders provide the operational evidence you need.' },
    ],
  },
  bot: {
    title: 'BOT Oversight Dashboard',
    queueTitle: 'Oversight snapshot',
    queueSubtitle: 'Review the visible event portfolio, leadership indicators, and final-report readiness without altering operational queues.',
    emptyMessage: 'No events are visible right now. Leadership-ready records will appear here once they move beyond drafts.',
    summaryCards: (events: Event[]) => [
      { label: 'Visible Events', value: events.length.toString(), helper: 'Non-draft events in the system' },
      { label: 'Completed / Reported', value: events.filter((event) => ['completed', 'report_submitted', 'archived'].includes(event.status)).length.toString(), helper: 'Ready for trustee review' },
      { label: 'Funded', value: events.filter((event) => event.status === 'funded').length.toString(), helper: 'Approved for execution' },
      { label: 'Planned Budget', value: formatCurrency(sumEstimated(events)), helper: 'Across visible trustee scope' },
    ],
    focusCards: [
      { title: 'Trustee oversight', body: 'Use the dashboard, analytics, and final reports to understand operational momentum without touching day-to-day workflow decisions.' },
      { title: 'Risk visibility', body: 'Review holds, rejections, and reporting gaps as leadership indicators across the portfolio.' },
      { title: 'Report readiness', body: 'Completed and reported events should flow into final-report review for board-level visibility.' },
    ],
  },
  designer: {
    title: 'Designer Dashboard',
    queueTitle: 'Flyer request queue',
    queueSubtitle: 'Only flyer workflow items assigned to the creative lane appear here.',
    emptyMessage: 'No flyer requests need attention right now. New creative work will appear here when requested.',
    summaryCards: (events: Event[]) => [
      { label: 'Flyer Items', value: events.length.toString(), helper: 'Creative work currently in scope' },
      { label: 'Awaiting Design', value: events.filter((event) => event.status === 'submitted').length.toString(), helper: 'Often the first creative-ready stage' },
      { label: 'Released Context', value: events.filter((event) => ['funded', 'completed', 'report_submitted'].includes(event.status)).length.toString(), helper: 'Useful for recap or update material' },
      { label: 'Workflow Focus', value: 'Flyers only', helper: 'Reports, analytics, and finance surfaces are intentionally hidden' },
    ],
    focusCards: [
      { title: 'Creative intake', body: 'Only flyer-requested events appear here, so the designer is not distracted by unrelated operations data.' },
      { title: 'Event context', body: 'Use the creative-safe event view for title, region, date, venue, brief notes, and shared folders only.' },
      { title: 'Release clarity', body: 'Drive links and workflow status make it clear when a flyer is being prepared, submitted, approved, or released.' },
    ],
  },
  social_media_team: {
    title: 'Social Media Dashboard',
    queueTitle: 'Documentation and content queue',
    queueSubtitle: 'Only post-event storytelling items appear here once an ECR exists.',
    emptyMessage: 'No social workflow items need attention right now. Documented events will appear here after reporting is ready.',
      summaryCards: (events: Event[]) => [
        { label: 'Storytelling Items', value: events.length.toString(), helper: 'Documented events in social scope' },
        { label: 'Completed Events', value: events.filter((event) => event.status === 'completed').length.toString(), helper: 'Awaiting packaging and documentation' },
        { label: 'Reported Events', value: events.filter((event) => event.status === 'report_submitted').length.toString(), helper: 'Best candidates for public-facing wrap-up' },
        { label: 'Content Brief', value: 'Use outcomes', helper: 'Focus on outcome text, participation context, venue, follow-up notes, and Drive assets' },
      ],
    focusCards: [
      { title: 'Post-event storytelling', body: 'This role sees only narrative text, participation context, and relevant folders so public storytelling stays aligned.' },
      { title: 'Context visibility', body: 'The social-safe event view includes outcome summary, execution notes, venue, goal, and participant context without finance data.' },
      { title: 'Reporting alignment', body: 'Once an ECR exists, the item becomes available here for captions, content packaging, and documentation handoff.' },
    ],
  },
  admin: {
    title: 'Admin Dashboard',
    queueTitle: 'Priority system queue',
    queueSubtitle: 'These are the highest-priority review items across the system.',
    emptyMessage: 'Your review queue is empty right now. New items will appear here when they need admin intervention.',
    summaryCards: (events: Event[], reviewQueue: Event[]) => [
      { label: 'Total Events', value: events.length.toString(), helper: 'Visible across the system' },
      { label: 'Open Review Items', value: reviewQueue.length.toString(), helper: 'May need admin intervention' },
      { label: 'Completed Events', value: events.filter((event) => event.status === 'completed' || event.status === 'report_submitted').length.toString(), helper: 'Done or report-ready' },
      { label: 'Total Planned Budget', value: formatCurrency(sumEstimated(events)), helper: 'Across visible event portfolio' },
    ],
    focusCards: [
      { title: 'System visibility', body: 'Admin dashboards highlight the queue health, approvals, and workflow bottlenecks across the platform.' },
      { title: 'Access and control', body: 'Use user management, templates, regions, and Drive configuration to keep the platform operating smoothly.' },
      { title: 'Leadership oversight', body: 'Analytics, history, archived events, and final reports provide the executive-level story behind operations.' },
    ],
  },
} satisfies Record<
  Profile['role'],
  {
    title: string
    queueTitle: string
    queueSubtitle: string
    emptyMessage: string
    summaryCards: (events: Event[], reviewQueue: Event[], userId?: string) => Array<{ label: string; value: string; helper: string }>
    focusCards: Array<{ title: string; body: string }>
  }
>

export default async function DashboardPage() {
  const supabase = await createClient()
  const service = await createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  let events: Event[] = []
  let creativeRows: Array<{ id: string; title: string; code: string | null; region: string; status: string; href: string }> = []

  if (profile.role === 'designer') {
    const [{ data: workflows }, { data: eventData }] = await Promise.all([
      service.from('flyer_requests').select('*').order('updated_at', { ascending: false }),
      service
        .from('events')
        .select('*')
        .eq('social_media_required', true)
        .in('status', ['submitted', 'events_approved', 'finance_approved', 'funded', 'completed', 'report_submitted']),
    ])
    const workflowByEvent = new Map((workflows ?? []).map((row: { event_id: string; status: string }) => [row.event_id, row]))
    events = (eventData ?? []) as Event[]
    creativeRows = events.slice(0, 6).map((event) => ({
      id: event.id,
      title: event.title,
      code: event.event_code,
      region: event.region,
      status: workflowByEvent.get(event.id)?.status ?? 'requested',
      href: `/dashboard/flyer-requests`,
    }))
  } else if (profile.role === 'social_media_team') {
    const [{ data: workflows }, { data: eventData }, { data: reports }] = await Promise.all([
      service.from('social_workflow_items').select('*').order('updated_at', { ascending: false }),
      service.from('events').select('*').in('status', ['completed', 'report_submitted', 'archived']),
      service.from('event_reports').select('event_id'),
    ])
    const reportIds = new Set((reports ?? []).map((row: { event_id: string }) => row.event_id))
    const workflowByEvent = new Map((workflows ?? []).map((row: { event_id: string; status: string }) => [row.event_id, row]))
    events = ((eventData ?? []) as Event[]).filter((event) => reportIds.has(event.id))
    creativeRows = events.slice(0, 6).map((event) => ({
      id: event.id,
      title: event.title,
      code: event.event_code,
      region: event.region,
      status: workflowByEvent.get(event.id)?.status ?? 'requested',
      href: `/dashboard/social-workflow`,
    }))
  } else {
    let eventsQuery = supabase
      .from('events')
      .select('*, profiles:created_by(full_name, email), budgets(*)')
      .order('created_at', { ascending: false })
      .limit(60)

    if (profile.role === 'regional_coordinator') {
      eventsQuery = eventsQuery.eq('created_by', user.id)
    } else if (profile.role !== 'admin') {
      eventsQuery = eventsQuery.neq('status', 'draft')
    }

    const { data: eventsData } = await eventsQuery
    events = (eventsData ?? []) as Event[]
  }
  const canCreate = can(profile.role, 'events:create')

  const reviewQueue = events.filter((event) =>
    (profile.role === 'events_team' && event.status === 'submitted') ||
    (profile.role === 'finance_team' && event.status === 'events_approved') ||
    (profile.role === 'accounts_team' && event.status === 'finance_approved') ||
    (profile.role === 'admin' && ['submitted', 'events_approved', 'finance_approved', 'on_hold', 'rejected'].includes(event.status))
  )
  const roleDashboard = ROLE_DASHBOARD_COPY[profile.role]
  const title = roleDashboard.title
  const summaryCards = roleDashboard.summaryCards(events, reviewQueue, user.id)

  const primaryEvents = profile.role === 'regional_coordinator' ? events.slice(0, 6) : reviewQueue.slice(0, 6)
  const visiblePrimaryEvents = primaryEvents.length > 0 ? primaryEvents : events.slice(0, 6)

  return (
    <div>
      <Header
        title={title}
        subtitle={`Signed in as ${ROLE_LABELS[profile.role]}. This dashboard prioritizes the tasks, budgets, and events most relevant to your role.`}
        eyebrow="Role workspace"
        canCreate={canCreate}
      />
      <PageShell>
        <StatGrid>
          {summaryCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </StatGrid>

        <SectionBlock title={roleDashboard.queueTitle} subtitle={roleDashboard.queueSubtitle}>
          {profile.role === 'designer' || profile.role === 'social_media_team' ? (
            creativeRows.length === 0 ? (
              <EmptyState
                title="Nothing needs attention right now"
                message={roleDashboard.emptyMessage}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {creativeRows.map((row) => (
                  <WorkflowSnapshotCard key={row.id} title={row.title} code={row.code} region={row.region} status={row.status} href={row.href} />
                ))}
              </div>
            )
          ) : visiblePrimaryEvents.length === 0 ? (
            <EmptyState
              title="Nothing needs attention right now"
              message={roleDashboard.emptyMessage}
              action={
                canCreate ? (
                  <Link href="/dashboard/events/new">
                    <span className="app-link-chip rounded-full px-4 py-2 text-sm font-medium shadow-sm">
                      Create new event
                    </span>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visiblePrimaryEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </SectionBlock>

        <SectionBlock
          title="Role operating focus"
          subtitle="The product surface changes by role so each team can move faster with the right context."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {roleDashboard.focusCards.map((card) => (
              <FocusCard key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </SectionBlock>

        <div className="flex flex-wrap justify-end gap-3">
          {can(profile.role, 'reports:read:any') && (
            <Link href="/dashboard/reports" className="app-link-chip rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-[var(--app-surface-soft)]">
              Open reports workspace →
            </Link>
          )}
          {profile.role === 'designer' ? (
            <Link href="/dashboard/flyer-requests" className="app-link-chip rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-[var(--app-surface-soft)]">
              Open flyer workflow →
            </Link>
          ) : profile.role === 'social_media_team' ? (
            <Link href="/dashboard/social-workflow" className="app-link-chip rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-[var(--app-surface-soft)]">
              Open social workflow →
            </Link>
          ) : (
            <Link href="/dashboard/events" className="app-link-chip rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-[var(--app-surface-soft)]">
              Open full events workspace →
            </Link>
          )}
        </div>
      </PageShell>
    </div>
  )
}

function FocusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="app-panel rounded-[1.3rem] p-5">
      <p className="app-text-strong text-sm font-semibold">{title}</p>
      <p className="app-text-muted mt-2 text-sm leading-6">{body}</p>
    </div>
  )
}

function WorkflowSnapshotCard({
  title,
  code,
  region,
  status,
  href,
}: {
  title: string
  code: string | null
  region: string
  status: string
  href: string
}) {
  return (
    <Link href={href} className="app-panel rounded-[1.3rem] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-strong)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">{code ?? 'Workflow item'}</p>
      <p className="app-text-strong mt-2 text-base font-semibold">{title}</p>
      <p className="app-text-muted mt-2 text-sm">{region}</p>
      <div className="mt-4 flex items-center justify-between text-xs font-medium">
        <span className="rounded-full border border-emerald-300 bg-[var(--app-success-bg)] px-2.5 py-1 text-[var(--app-success-text)]">
          {status.replaceAll('_', ' ')}
        </span>
        <span className="text-green-700 dark:text-emerald-300">Open workflow</span>
      </div>
    </Link>
  )
}
