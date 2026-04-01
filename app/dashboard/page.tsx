import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { EventCard } from '@/components/events/EventCard'
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import { formatCurrency } from '@/lib/utils/formatters'
import { EmptyState, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import type { Event, Profile } from '@/types/database'

function sumEstimated(events: Event[]) {
  return events.reduce((sum, event) => sum + (event.budgets?.reduce((lineSum, line) => lineSum + line.estimated_amount, 0) ?? 0), 0)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

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
  const events = (eventsData ?? []) as Event[]
  const canCreate = can(profile.role, 'events:create')

  const myDrafts = events.filter((event) => event.status === 'draft')
  const mySubmitted = events.filter((event) => ['submitted', 'events_approved', 'finance_approved', 'funded', 'on_hold', 'rejected'].includes(event.status))
  const reportsPending = events.filter((event) => event.status === 'completed')

  const reviewQueue = events.filter((event) =>
    (profile.role === 'events_team' && event.status === 'submitted') ||
    (profile.role === 'finance_team' && event.status === 'events_approved') ||
    (profile.role === 'accounts_team' && event.status === 'finance_approved') ||
    (profile.role === 'admin' && ['submitted', 'events_approved', 'finance_approved', 'on_hold', 'rejected'].includes(event.status))
  )

  const title =
    profile.role === 'regional_coordinator'
      ? 'Regional Coordinator Dashboard'
      : profile.role === 'events_team'
        ? 'Events Team Dashboard'
        : profile.role === 'finance_team'
          ? 'Finance Team Dashboard'
          : profile.role === 'accounts_team'
            ? 'Accounts Team Dashboard'
            : 'Admin Dashboard'

  const summaryCards =
    profile.role === 'regional_coordinator'
      ? [
          { label: 'My Drafts', value: myDrafts.length.toString(), helper: 'Proposals still being shaped' },
          { label: 'In Workflow', value: mySubmitted.length.toString(), helper: 'Events moving through review' },
          { label: 'Reports Due', value: reportsPending.length.toString(), helper: 'Completed events awaiting ECR' },
          { label: 'Planned Budget', value: formatCurrency(sumEstimated(events)), helper: 'Across your visible events' },
        ]
      : profile.role === 'events_team'
        ? [
            { label: 'Submitted Queue', value: events.filter((event) => event.status === 'submitted').length.toString(), helper: 'New proposals awaiting Events review' },
            { label: 'My Review Queue', value: reviewQueue.length.toString(), helper: 'Items needing immediate action' },
            { label: 'Events Created', value: events.filter((event) => event.created_by === user.id).length.toString(), helper: 'Your own proposals still visible here' },
            { label: 'Budget In Queue', value: formatCurrency(sumEstimated(reviewQueue)), helper: 'Total proposed budget under review' },
          ]
        : profile.role === 'finance_team'
          ? [
              { label: 'Finance Queue', value: reviewQueue.length.toString(), helper: 'Items awaiting finance review' },
              { label: 'Events Approved', value: events.filter((event) => event.status === 'events_approved').length.toString(), helper: 'Cleared by Events team' },
              { label: 'Budget In Queue', value: formatCurrency(sumEstimated(reviewQueue)), helper: 'Funding scope currently under review' },
              { label: 'Funded Events', value: events.filter((event) => event.status === 'funded').length.toString(), helper: 'Already approved for funding' },
            ]
          : profile.role === 'accounts_team'
            ? [
                { label: 'Accounts Queue', value: reviewQueue.length.toString(), helper: 'Finance-approved events needing release review' },
                { label: 'Finance Approved', value: events.filter((event) => event.status === 'finance_approved').length.toString(), helper: 'Ready for Accounts attention' },
                { label: 'Funded', value: events.filter((event) => event.status === 'funded').length.toString(), helper: 'Cleared for release' },
                { label: 'Budget In Queue', value: formatCurrency(sumEstimated(reviewQueue)), helper: 'Financial exposure in the queue' },
              ]
            : [
                { label: 'Total Events', value: events.length.toString(), helper: 'Visible across the system' },
                { label: 'Open Review Items', value: reviewQueue.length.toString(), helper: 'May need admin intervention' },
                { label: 'Completed Events', value: events.filter((event) => event.status === 'completed' || event.status === 'report_submitted').length.toString(), helper: 'Done or report-ready' },
                { label: 'Total Planned Budget', value: formatCurrency(sumEstimated(events)), helper: 'Across visible event portfolio' },
              ]

  const primaryEvents = profile.role === 'regional_coordinator' ? events.slice(0, 6) : reviewQueue.slice(0, 6)

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

        <SectionBlock
          title={
            profile.role === 'regional_coordinator'
              ? 'My event pipeline'
              : profile.role === 'admin'
                ? 'Priority system queue'
                : 'My review queue'
          }
          subtitle={
            profile.role === 'regional_coordinator'
              ? 'Track your event journey from draft creation to final reporting.'
              : profile.role === 'admin'
                ? 'These are the highest-priority review items across the system.'
                : 'These events currently require action from your role.'
          }
        >
          {primaryEvents.length === 0 ? (
            <EmptyState
              title="Nothing needs attention right now"
              message={
                profile.role === 'regional_coordinator'
                  ? 'Your event list is clear. Drafts, submissions, and completion tasks will appear here when they need action.'
                  : 'Your review queue is empty right now. New items will appear here when they reach your approval stage.'
              }
              action={
                canCreate ? (
                  <Link href="/dashboard/events/new">
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm">Create new event</span>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {primaryEvents.map((event) => (
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
            {profile.role === 'regional_coordinator' && (
              <>
                <FocusCard title="Proposal readiness" body="Use the event editor to strengthen scope, logistics, budget quality, and social/media requirements before submission." />
                <FocusCard title="Workflow follow-up" body="Respond quickly to holds, rejections, or revision requests to keep approvals moving." />
                <FocusCard title="Completion reporting" body="Once funded and completed, capture actual outcomes and spending clearly so the final report is stakeholder-ready." />
              </>
            )}
            {profile.role === 'events_team' && (
              <>
                <FocusCard title="Proposal clarity" body="Focus on objective fit, venue readiness, participant suitability, and execution feasibility." />
                <FocusCard title="First-stage review" body="Approve only when the event has enough operational clarity to move confidently into finance review." />
                <FocusCard title="Visible next steps" body="Use the event detail and review workspace to understand what changed and what still needs attention." />
              </>
            )}
            {profile.role === 'finance_team' && (
              <>
                <FocusCard title="Budget logic" body="Review proposed budgets against scope, event size, and expected delivery complexity." />
                <FocusCard title="Funding discipline" body="Look for overspend risk, weak justification, or donation assumptions that need clearer backing." />
                <FocusCard title="Decision confidence" body="Use report and event details to understand whether the financial structure is realistic and defensible." />
              </>
            )}
            {profile.role === 'accounts_team' && (
              <>
                <FocusCard title="Release readiness" body="Review only finance-approved items and make sure the numbers and support materials are release-ready." />
                <FocusCard title="Variance review" body="Use the event page and final report to compare planned vs actual cost patterns before final release." />
                <FocusCard title="Support documents" body="Drive-linked invoice, report, and media folders provide the operational evidence you need." />
              </>
            )}
            {profile.role === 'admin' && (
              <>
                <FocusCard title="System visibility" body="Admin dashboards highlight the queue health, approvals, and workflow bottlenecks across the platform." />
                <FocusCard title="Access and control" body="Use user management, templates, regions, and Drive configuration to keep the platform operating smoothly." />
                <FocusCard title="Leadership oversight" body="Analytics, history, archived events, and final reports provide the executive-level story behind operations." />
              </>
            )}
          </div>
        </SectionBlock>

        <div className="flex justify-end">
          <Link href="/dashboard/events" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-slate-50">
            Open full events workspace →
          </Link>
        </div>
      </PageShell>
    </div>
  )
}

function FocusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  )
}
