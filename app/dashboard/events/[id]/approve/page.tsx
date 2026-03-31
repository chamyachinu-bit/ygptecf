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
import { ROLE_REVIEWABLE_STATUSES } from '@/lib/utils/permissions'
import type { Event, Profile, Approval } from '@/types/database'

export default function ApprovePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [event, setEvent] = useState<Event | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { data: eventData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('events').select('*, budgets(*), approvals(*)').eq('id', id).single(),
      ])
      setProfile(profileData)
      setEvent(eventData)
    }
    load()
  }, [id])

  const handleDecision = async (decision: 'approved' | 'rejected' | 'on_hold') => {
    if (!profile || !event) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: approvalError } = await supabase.from('approvals').insert({
      event_id: id,
      reviewer_id: user.id,
      stage: profile.role,
      decision,
      comments: comments || null,
    })

    if (approvalError) {
      setError(approvalError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/events/${id}`)
  }

  if (!event || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  const canReview = ROLE_REVIEWABLE_STATUSES[profile.role]?.includes(event.status)
  const alreadyReviewed = event.approvals?.some((a: Approval) => a.stage === profile.role)

  if (!canReview || alreadyReviewed) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">
              {alreadyReviewed
                ? 'You have already reviewed this event.'
                : 'This event is not ready for your review yet.'}
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
          <h1 className="text-lg font-semibold">Review Event</h1>
          <p className="text-xs text-gray-500">{event.title}</p>
        </div>
        <StatusBadge status={event.status} flagged={event.is_budget_flagged} />
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
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
              <div><span className="text-gray-500">Total Budget:</span> <strong className={event.is_budget_flagged ? 'text-orange-600' : ''}>${total.toLocaleString()}</strong></div>
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
          <CardContent>
            <BudgetLineItems items={event.budgets ?? []} onChange={() => {}} readOnly />
          </CardContent>
        </Card>

        {/* Decision */}
        <Card>
          <CardHeader><CardTitle>Your Decision</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Comments (optional)</Label>
              <Textarea
                placeholder="Add any comments, conditions, or reasons for your decision..."
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
                onClick={() => handleDecision('approved')}
                loading={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                onClick={() => handleDecision('on_hold')}
                loading={loading}
                variant="outline"
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                Hold
              </Button>
              <Button
                onClick={() => handleDecision('rejected')}
                loading={loading}
                variant="destructive"
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
