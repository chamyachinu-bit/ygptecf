'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, CirclePause, ShieldCheck, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BudgetLineItems } from '@/components/events/BudgetLineItems'
import { DriveFoldersPanel } from '@/components/events/DriveFoldersPanel'
import { StatusBadge } from '@/components/events/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHero, PageShell, SectionBlock, StatCard, StatGrid } from '@/components/ui/page-shell'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import type { Approval, ApprovalComment, Event, Profile, UserRole } from '@/types/database'

const REVIEW_STAGES: UserRole[] = ['events_team', 'finance_team', 'accounts_team']

const REVIEWER_CONFIG: Record<UserRole, { title: string; summary: string; prompts: string[] }> = {
  regional_coordinator: {
    title: 'Coordinator View',
    summary: 'Regional coordinators do not review approval stages directly.',
    prompts: [],
  },
  events_team: {
    title: 'Events Team Review Workspace',
    summary: 'Focus on proposal readiness, objective clarity, venue feasibility, and social execution readiness.',
    prompts: ['Is the proposal objective clear and practical?', 'Does the venue and participant setup feel operationally realistic?', 'Are the social deliverables clear enough for execution?'],
  },
  finance_team: {
    title: 'Finance Review Workspace',
    summary: 'Focus on budget discipline, funding logic, donation visibility, and cost realism.',
    prompts: ['Does the funding request match the event scale?', 'Are any categories under-estimated or over-weighted?', 'Are donation/support notes sufficient for finance review?'],
  },
  accounts_team: {
    title: 'Accounts Final Review Workspace',
    summary: 'Focus on finance evidence readiness, invoice routing, and release confidence before post-event closure.',
    prompts: ['Will Accounts receive enough support documentation later?', 'Do budget lines feel reconcilable after execution?', 'Are report and invoice folders ready for audit follow-through?'],
  },
  bot: {
    title: 'BOT Oversight Workspace',
    summary: 'Board of Trustees users can inspect the event context, history, and support materials, but they do not act as a standard approval stage.',
    prompts: ['Use this space for leadership review and oversight.', 'Check final reports, history, and support evidence before escalating concerns.', 'Operational approval decisions remain with the workflow reviewers or admin.'],
  },
  designer: {
    title: 'Designer Workspace',
    summary: 'Design users can inspect event context and support materials, but they are not part of the approval chain.',
    prompts: ['Use the event context to understand title, region, and timing.', 'Review linked support folders before preparing flyer or support creative.', 'Approval decisions remain with workflow reviewers or admin.'],
  },
  social_media_team: {
    title: 'Social Media Workspace',
    summary: 'Social Media Team users can inspect event context and documentation readiness, but they do not act as a standard approval stage.',
    prompts: ['Use the event and report context to prepare post-event communication.', 'Check support folders before packaging media or documentation.', 'Approval decisions remain with workflow reviewers or admin.'],
  },
  admin: {
    title: 'Admin Override Workspace',
    summary: 'Admins can review any stage, revise prior decisions, and inspect the entire supporting context before intervening.',
    prompts: ['Use stage override carefully and review earlier notes first.', 'Support folders and history should be checked before changing a saved decision.', 'Use this mode for escalation, cleanup, or final governance intervention.'],
  },
}

export default function ApprovePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [comments, setComments] = useState('')
  const [selectedDecision, setSelectedDecision] = useState<'approved' | 'rejected' | 'on_hold' | null>(null)
  const [selectedStage, setSelectedStage] = useState<UserRole | null>(null)
  const [existingApproval, setExistingApproval] = useState<Approval | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { data: eventData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('events').select('*, budgets(*), approvals(*, approval_comments(*))').eq('id', id).single(),
      ])

      setProfile(profileData)
      setEvent(eventData)

      const defaultStage = profileData?.role === 'admin' ? ((eventData?.current_reviewer as UserRole | null) || 'events_team') : (profileData?.role as UserRole)
      setSelectedStage(defaultStage)
      const matchedApproval = eventData?.approvals?.find((approval: Approval) => approval.stage === defaultStage) ?? null
      setExistingApproval(matchedApproval)
      setSelectedDecision(matchedApproval?.decision ?? null)
      setComments('')
    }

    load()
  }, [id, supabase])

  useEffect(() => {
    if (!event || !selectedStage) return
    const matchedApproval = event.approvals?.find((approval: Approval) => approval.stage === selectedStage) ?? null
    setExistingApproval(matchedApproval)
    setSelectedDecision(matchedApproval?.decision ?? null)
    setComments('')
  }, [event, selectedStage])

  const handleDecision = async (decision: 'approved' | 'rejected' | 'on_hold') => {
    if (!profile || !event) return
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (!comments.trim()) {
      setError(existingApproval ? 'Please add a fresh reason for revising the saved decision.' : 'Please add a reason or note for this decision.')
      setLoading(false)
      return
    }

    const approvalPayload = {
      event_id: id,
      reviewer_id: user.id,
      stage: selectedStage ?? profile.role,
      decision,
      comments: comments.trim() || null,
    }

    const { error: approvalError } = existingApproval
      ? await supabase
          .from('approvals')
          .update({
            reviewer_id: user.id,
            stage: selectedStage ?? profile.role,
            decision,
            comments: comments.trim() || null,
            decided_at: new Date().toISOString(),
          })
          .eq('id', existingApproval.id)
      : await supabase.from('approvals').insert(approvalPayload)

    if (approvalError) {
      setError(approvalError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/events/${id}`)
    router.refresh()
  }

  if (!event || !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    )
  }

  const canReview = ROLE_REVIEWABLE_STATUSES[profile.role]?.includes(event.status)
  const adminCanReview = profile.role === 'admin'
  const decisionHistory = (existingApproval?.approval_comments ?? [])
    .slice()
    .sort((a: ApprovalComment, b: ApprovalComment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const roleConfig = REVIEWER_CONFIG[profile.role]
  const reviewTitle = profile.role === 'admin' && selectedStage ? `${roleConfig.title} · ${selectedStage.replace('_', ' ')} stage` : roleConfig.title
  const total = event.budgets?.reduce((sum, line) => sum + line.estimated_amount, 0) ?? 0
  const actual = event.budgets?.reduce((sum, line) => sum + Number(line.actual_amount || 0), 0) ?? 0

  if (!adminCanReview && !canReview && !existingApproval) {
    return (
      <PageShell>
        <Card className="rounded-[1.5rem] border-slate-200/80">
          <CardContent className="p-10 text-center">
            <p className="text-slate-600">This event is not ready for your review yet.</p>
            <Link href={`/dashboard/events/${id}`} className="mt-5 inline-flex">
              <Button variant="outline">Back to Event</Button>
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <div>
      <PageShell>
        <PageHero
          lead={
            <Link href={`/dashboard/events/${id}`}>
              <Button size="sm" variant="secondary" className="border border-white/80 bg-white text-slate-900 shadow-lg hover:bg-slate-100">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Event
              </Button>
            </Link>
          }
          eyebrow="Review Workspace"
          title={reviewTitle}
          subtitle={roleConfig.summary}
        >
          <div className="space-y-4">
            <StatusBadge status={event.status} flagged={event.is_budget_flagged} />
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-emerald-100/70">Event in review</p>
              <p className="mt-2 text-lg font-semibold">{event.title}</p>
              <p className="mt-1 text-sm text-emerald-50/80">{event.region} · {event.location}</p>
            </div>
          </div>
        </PageHero>

        <StatGrid>
          <StatCard label="Planned budget" value={`Rs ${total.toLocaleString('en-IN')}`} helper="EPF estimated total" />
          <StatCard label="Actual spend" value={`Rs ${actual.toLocaleString('en-IN')}`} helper="Visible to finance, accounts, and admin" />
          <StatCard label="Expected attendees" value={String(event.expected_attendees)} helper="Proposal participation target" />
          <StatCard label="Saved review notes" value={String(decisionHistory.length)} helper="Initial decision plus revisions" />
        </StatGrid>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <SectionBlock title="Role Focus" subtitle="This review panel is tailored to the current role and stage context.">
              <div className="grid gap-3 lg:grid-cols-3">
                {roleConfig.prompts.map((prompt) => (
                  <div key={prompt} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">
                    {prompt}
                  </div>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock title="Proposal Snapshot" subtitle="Use this summary to judge readiness before deciding.">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard title="Event scope" value={`${event.title}\n${event.region}\n${event.event_date}\n${event.location}`} />
                <InfoCard title="Proposal narrative" value={event.description || 'No narrative provided.'} />
                <InfoCard title="Participation" value={`${event.expected_attendees} expected attendees`} />
                <InfoCard title="Budget" value={`Planned: Rs ${total.toLocaleString('en-IN')}\nActual: Rs ${actual.toLocaleString('en-IN')}`} />
              </div>
            </SectionBlock>

            <SectionBlock title="Budget Breakdown" subtitle="Finance-heavy roles get actual-versus-planned visibility here.">
              <BudgetLineItems items={event.budgets ?? []} readOnly showActual={profile.role === 'finance_team' || profile.role === 'accounts_team' || profile.role === 'admin'} />
              {(profile.role === 'finance_team' || profile.role === 'accounts_team' || profile.role === 'admin') && (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-semibold text-slate-500">Category</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Proposed</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Actual</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(event.budgets ?? []).map((line, index) => {
                        const proposed = Number(line.estimated_amount) || 0
                        const actualAmount = Number(line.actual_amount) || 0
                        const variance = actualAmount - proposed
                        return (
                          <tr key={`${line.category}-${index}`} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-900">{line.category}</td>
                            <td className="px-4 py-3 text-slate-700">Rs {proposed.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-slate-700">Rs {actualAmount.toLocaleString('en-IN')}</td>
                            <td className={`px-4 py-3 font-semibold ${variance > 0 ? 'text-rose-600' : variance < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {variance > 0 ? '+' : ''}Rs {variance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionBlock>

            <DriveFoldersPanel
              eventId={id}
              title="Review Documents"
              description="Use Drive-linked proposal, media, report, and invoice folders to validate supporting evidence."
              folders={
                profile.role === 'events_team'
                  ? [
                      { key: 'proposal', label: 'Proposal Folder', description: 'Original proposal support documents.', url: event.proposal_drive_url },
                      { key: 'media', label: 'Media Folder', description: 'Media readiness and communication assets.', url: event.media_drive_url },
                    ]
                  : [
                      { key: 'proposal', label: 'Proposal Folder', description: 'Original proposal support documents.', url: event.proposal_drive_url },
                      { key: 'media', label: 'Media Folder', description: 'Event media and communication assets.', url: event.media_drive_url },
                      { key: 'report', label: 'Report Folder', description: 'Completion evidence and reporting documents.', url: event.report_drive_url },
                      { key: 'invoice', label: 'Invoice Folder', description: 'Invoices, receipts, and finance support files.', url: event.invoice_drive_url },
                    ]
              }
              syncStatus={event.drive_sync_status}
              syncMessage={event.drive_sync_message}
              canRefresh={profile.role === 'admin'}
            />
          </div>

          <div className="space-y-6">
            <SectionBlock title="Decision Panel" subtitle="Each revision creates a fresh reason entry so the approval trail stays auditable.">
              <div className="space-y-4">
                {profile.role === 'admin' && (
                  <div className="space-y-1.5">
                    <Label>Approval Stage</Label>
                    <select
                      value={selectedStage ?? ''}
                      onChange={(e) => setSelectedStage(e.target.value as UserRole)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                    >
                      {REVIEW_STAGES.map((stage) => (
                        <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                )}

                {existingApproval && (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                    Current saved decision: <strong>{existingApproval.decision}</strong>. Add a new reason if you want to revise it.
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>{existingApproval ? 'New Reason For Change' : 'Decision Reason'}</Label>
                  <Textarea
                    placeholder={existingApproval ? 'Explain why the previous decision should change...' : 'Add the reason, condition, or governance note for this decision...'}
                    rows={5}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>

                {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

                <div className="grid gap-3">
                  <Button
                    onClick={() => {
                      setSelectedDecision('approved')
                      handleDecision('approved')
                    }}
                    loading={loading}
                    className="h-12 justify-start gap-2 bg-gradient-to-r from-emerald-600 to-green-600"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {existingApproval ? 'Update To Approve' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedDecision('on_hold')
                      handleDecision('on_hold')
                    }}
                    loading={loading}
                    variant="outline"
                    className="h-12 justify-start gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <CirclePause className="h-4 w-4" />
                    {existingApproval ? 'Update To Hold' : 'Put On Hold'}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedDecision('rejected')
                      handleDecision('rejected')
                    }}
                    loading={loading}
                    variant="destructive"
                    className="h-12 justify-start gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    {existingApproval ? 'Update To Reject' : 'Reject'}
                  </Button>
                </div>

                {selectedDecision && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Selected action: <strong>{selectedDecision}</strong>
                  </div>
                )}
              </div>
            </SectionBlock>

            <SectionBlock title="Decision History" subtitle="Initial decision plus every later revision is preserved below.">
              {decisionHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No saved history for this stage yet.</p>
              ) : (
                <div className="space-y-3">
                  {decisionHistory.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <p className="font-semibold text-slate-900">{entry.is_revision ? 'Revision note' : 'Initial decision'}</p>
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{entry.decision}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(entry.created_at).toLocaleString('en-IN')}</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.comment || 'No reason provided.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionBlock>
          </div>
        </div>
      </PageShell>
    </div>
  )
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  )
}
