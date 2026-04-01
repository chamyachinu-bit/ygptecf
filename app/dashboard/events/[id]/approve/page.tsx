'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/events/StatusBadge'
import { BudgetLineItems } from '@/components/events/BudgetLineItems'
import { DriveFoldersPanel } from '@/components/events/DriveFoldersPanel'
import { ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import type { Event, Profile, Approval, ApprovalComment, UserRole } from '@/types/database'

const REVIEW_STAGES: UserRole[] = ['events_team', 'finance_team', 'accounts_team']

const REVIEWER_CONFIG: Record<UserRole, {
  title: string
  accent: string
  summary: string
  prompts: string[]
}> = {
  regional_coordinator: {
    title: 'Coordinator Review',
    accent: 'green',
    summary: 'Coordinator role does not review approval stages directly.',
    prompts: [],
  },
  events_team: {
    title: 'Events Team Review Workspace',
    accent: 'blue',
    summary: 'Focus on proposal clarity, objective fit, venue readiness, and social/media execution feasibility.',
    prompts: ['Is the event objective clear and practical?', 'Does the venue and participant setup look realistic?', 'Are the social/media requirements clear enough for delivery?'],
  },
  finance_team: {
    title: 'Finance Review Workspace',
    accent: 'violet',
    summary: 'Focus on budget discipline, proposed versus likely actual cost, and donation/support visibility.',
    prompts: ['Does the budget logic match the event scope?', 'Are there likely overspend or under-allocation areas?', 'Do the notes justify the requested funding clearly?'],
  },
  accounts_team: {
    title: 'Accounts Final Review Workspace',
    accent: 'amber',
    summary: 'Focus on invoice/readiness, final release confidence, and post-event finance evidence.',
    prompts: ['Will Accounts need invoice support later for this event?', 'Does the cost structure look ready for release and post-event reconciliation?', 'Are report and finance document routes clearly available?'],
  },
  admin: {
    title: 'Admin Override Review Workspace',
    accent: 'emerald',
    summary: 'Admin can review or revise any stage with full visibility into history and support links.',
    prompts: ['Use the stage selector when acting as an override reviewer.', 'Check prior reviewer notes before changing the workflow.', 'Use Drive links and event history to validate supporting evidence.'],
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { data: eventData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('events').select('*, budgets(*), approvals(*, approval_comments(*))').eq('id', id).single(),
      ])
      setProfile(profileData)
      setEvent(eventData)
      const defaultStage = profileData?.role === 'admin'
        ? ((eventData?.current_reviewer as UserRole | null) || 'events_team')
        : (profileData?.role as UserRole)
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (existingApproval && !comments.trim()) {
      setError('Please add a new reason for changing the saved decision.')
      setLoading(false)
      return
    }

    if (!existingApproval && !comments.trim()) {
      setError('Please add a reason or note for this decision.')
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
      : await supabase
          .from('approvals')
          .insert(approvalPayload)

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  const canReview = ROLE_REVIEWABLE_STATUSES[profile.role]?.includes(event.status)
  const decisionHistory = (existingApproval?.approval_comments ?? [])
    .slice()
    .sort((a: ApprovalComment, b: ApprovalComment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const roleConfig = REVIEWER_CONFIG[profile.role]
  const reviewTitle = profile.role === 'admin' && selectedStage
    ? `${roleConfig.title} · ${selectedStage.replace('_', ' ')} stage`
    : roleConfig.title
  const driveFolders = [
    { key: 'proposal', label: 'Proposal Folder', description: 'Original proposal support documents.', url: event.proposal_drive_url },
    { key: 'media', label: 'Media Folder', description: 'Event media and communication assets.', url: event.media_drive_url },
    { key: 'report', label: 'Report Folder', description: 'Completion evidence and report material.', url: event.report_drive_url },
    { key: 'invoice', label: 'Invoice Folder', description: 'Invoices, receipts, and finance support files.', url: event.invoice_drive_url },
  ]

  const adminCanReview = profile.role === 'admin'
  if (!adminCanReview && !canReview && !existingApproval) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">
              This event is not ready for your review yet.
            </p>
            <Link href={`/dashboard/events/${id}`}>
              <Button variant="outline" className="mt-4">Back to Event</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const total = event.budgets?.reduce((s, b) => s + b.estimated_amount, 0) ?? 0

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/dashboard/events/${id}`}>
          <button className="p-1.5 rounded hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{reviewTitle}</h1>
          <p className="text-xs text-gray-500">{event.title}</p>
        </div>
        <StatusBadge status={event.status} flagged={event.is_budget_flagged} />
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Role Focus</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">{roleConfig.summary}</p>
            {roleConfig.prompts.length > 0 && (
              <div className="grid gap-2 md:grid-cols-3">
                {roleConfig.prompts.map((prompt) => (
                  <div key={prompt} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    {prompt}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Summary */}
        <Card>
          <CardHeader><CardTitle>Event Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-gray-500">Title:</span> <strong>{event.title}</strong></div>
              <div><span className="text-gray-500">Region:</span> {event.region}</div>
              <div><span className="text-gray-500">Date:</span> {event.event_date}</div>
              <div><span className="text-gray-500">Location:</span> {event.location}</div>
              <div><span className="text-gray-500">Attendees:</span> {event.expected_attendees}</div>
              <div><span className="text-gray-500">Total Budget:</span> <strong className={event.is_budget_flagged ? 'text-orange-600' : ''}>₹{total.toLocaleString('en-IN')}</strong></div>
            </div>
            {event.description && (
              <p className="text-gray-700 border-t pt-3">{event.description}</p>
            )}
            {event.is_budget_flagged && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 text-orange-700">
                ⚠ Budget Alert: {event.flag_reason}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader><CardTitle>Budget Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <BudgetLineItems items={event.budgets ?? []} readOnly showActual={profile.role === 'accounts_team' || profile.role === 'finance_team' || profile.role === 'admin'} />
            {(profile.role === 'finance_team' || profile.role === 'accounts_team' || profile.role === 'admin') && (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-gray-500">Category</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Proposed</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Actual</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(event.budgets ?? []).map((line, index) => {
                      const proposed = Number(line.estimated_amount) || 0
                      const actual = Number(line.actual_amount) || 0
                      const variance = actual - proposed
                      return (
                        <tr key={`${line.category}-${index}`} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">{line.category}</td>
                          <td className="px-4 py-3 text-gray-700">₹{proposed.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-gray-700">₹{actual.toLocaleString('en-IN')}</td>
                          <td className={`px-4 py-3 font-medium ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                            {variance > 0 ? '+' : ''}₹{variance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <DriveFoldersPanel
          eventId={id}
          title="Review Documents"
          description="Reviewers can use these linked Drive folders to inspect proposal evidence, media, post-event reporting, and finance documents."
          folders={
            profile.role === 'events_team'
              ? driveFolders.filter((folder) => ['proposal', 'media'].includes(folder.key))
              : driveFolders
          }
          syncStatus={event.drive_sync_status}
          syncMessage={event.drive_sync_message}
          canRefresh={profile.role === 'admin'}
        />

        {/* Decision */}
        <Card>
          <CardHeader>
            <CardTitle>{existingApproval ? 'Revise Your Decision' : 'Your Decision'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.role === 'admin' && (
              <div className="space-y-1.5">
                <Label>Approval Stage</Label>
                <select
                  value={selectedStage ?? ''}
                  onChange={(e) => setSelectedStage(e.target.value as UserRole)}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {REVIEW_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Admin can act as an override reviewer for any approval stage.</p>
              </div>
            )}
            {existingApproval && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Current saved decision: <strong>{existingApproval.decision}</strong>. If you change it, a new reason will be stored as a separate history note.
              </div>
            )}
            {existingApproval && decisionHistory.length > 0 && (
              <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">Decision History</p>
                {decisionHistory.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {entry.is_revision ? 'Revision' : 'Initial decision'}: {entry.decision}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(entry.created_at).toLocaleString('en-IN')}</p>
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap">{entry.comment || 'No reason provided.'}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{existingApproval ? 'New Reason for Change' : 'Decision Reason'}</Label>
              <Textarea
                placeholder={existingApproval
                  ? 'Explain why you are changing the previous decision...'
                  : 'Add the reason, conditions, or context for this decision...'}
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSelectedDecision('approved')
                  handleDecision('approved')
                }}
                loading={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {existingApproval ? 'Update to Approve' : 'Approve'}
              </Button>
              <Button
                onClick={() => {
                  setSelectedDecision('on_hold')
                  handleDecision('on_hold')
                }}
                loading={loading}
                variant="outline"
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                {existingApproval ? 'Update to Hold' : 'Hold'}
              </Button>
              <Button
                onClick={() => {
                  setSelectedDecision('rejected')
                  handleDecision('rejected')
                }}
                loading={loading}
                variant="destructive"
                className="flex-1"
              >
                {existingApproval ? 'Update to Reject' : 'Reject'}
              </Button>
            </div>
            {selectedDecision && (
              <p className="text-xs text-gray-500">
                Selected action: <strong>{selectedDecision}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
