'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from '@/components/events/FileUpload'
import { BudgetLineItems, type BudgetLine } from '@/components/events/BudgetLineItems'
import type { Event } from '@/types/database'

export default function ReportPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [event, setEvent] = useState<Event | null>(null)
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    actual_attendees: '',
    execution_details: '',
    outcome_summary: '',
    challenges: '',
    lessons_learned: '',
    budget_notes: '',
    donations_received: '',
    donation_notes: '',
    actual_start_time: '',
    actual_end_time: '',
    actual_location: '',
    social_media_writeup: '',
    follow_up_actions: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data } = await supabase
        .from('events')
        .select('*, budgets(*)')
        .eq('id', id)
        .single()

      if (data) {
        setEvent(data)
        setBudgetLines(
          (data.budgets ?? []).map((line: BudgetLine) => ({
            id: line.id,
            category: line.category,
            description: line.description,
            justification: line.justification,
            estimated_amount: Number(line.estimated_amount) || 0,
            actual_amount: line.actual_amount ?? null,
          }))
        )
        setForm((current) => ({
          ...current,
          actual_location: data.location || '',
        }))
      }
    }

    load()
  }, [id, supabase])

  const actualTotal = useMemo(
    () => budgetLines.reduce((sum, line) => sum + (Number(line.actual_amount) || 0), 0),
    [budgetLines]
  )

  const estimatedTotal = useMemo(
    () => budgetLines.reduce((sum, line) => sum + (Number(line.estimated_amount) || 0), 0),
    [budgetLines]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!userId) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { error: reportError } = await supabase.from('event_reports').insert({
      event_id: id,
      submitted_by: userId,
      actual_attendees: parseInt(form.actual_attendees, 10) || null,
      execution_details: form.execution_details || null,
      outcome_summary: form.outcome_summary || null,
      challenges: form.challenges || null,
      lessons_learned: form.lessons_learned || null,
      budget_notes: form.budget_notes || null,
      donations_received: Number(form.donations_received) || 0,
      donation_notes: form.donation_notes || null,
      actual_start_time: form.actual_start_time || null,
      actual_end_time: form.actual_end_time || null,
      actual_location: form.actual_location || null,
      social_media_writeup: form.social_media_writeup || null,
      follow_up_actions: form.follow_up_actions || null,
    })

    if (reportError) {
      setError(reportError.message)
      setLoading(false)
      return
    }

    const updatedBudgetLines = budgetLines.filter((line) => line.id)
    if (updatedBudgetLines.length > 0) {
      const budgetUpdates = await Promise.all(
        updatedBudgetLines.map((line) =>
          supabase
            .from('budgets')
            .update({ actual_amount: Number(line.actual_amount) || 0 })
            .eq('id', line.id!)
        )
      )

      const failedUpdate = budgetUpdates.find((result) => result.error)
      if (failedUpdate?.error) {
        setError(failedUpdate.error.message)
        setLoading(false)
        return
      }
    }

    fetch('/api/events/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: id }),
    }).catch(() => {})

    router.push(`/dashboard/events/${id}`)
  }

  if (!event) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/dashboard/events/${id}`}>
          <button className="p-1.5 rounded hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Event Completion Report</h1>
          <p className="text-xs text-gray-500">{event.event_code} · {event.title}</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Event Execution Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Actual Participants *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder={`Expected: ${event.expected_attendees}`}
                    value={form.actual_attendees}
                    onChange={(e) => setForm({ ...form, actual_attendees: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual Start Time</Label>
                  <Input
                    type="time"
                    value={form.actual_start_time}
                    onChange={(e) => setForm({ ...form, actual_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual End Time</Label>
                  <Input
                    type="time"
                    value={form.actual_end_time}
                    onChange={(e) => setForm({ ...form, actual_end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Actual Venue / Location</Label>
                <Input
                  value={form.actual_location}
                  onChange={(e) => setForm({ ...form, actual_location: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Execution Details *</Label>
                <Textarea
                  placeholder="Document what happened on the day, agenda delivered, attendance quality, and operational notes."
                  rows={4}
                  value={form.execution_details}
                  onChange={(e) => setForm({ ...form, execution_details: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Outcome Summary *</Label>
                <Textarea
                  placeholder="Describe what the event achieved, key milestones, and measurable outcomes."
                  rows={4}
                  value={form.outcome_summary}
                  onChange={(e) => setForm({ ...form, outcome_summary: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Issues / Challenges</Label>
                  <Textarea
                    placeholder="What went wrong, what changed, or what needs follow-up?"
                    rows={3}
                    value={form.challenges}
                    onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lessons Learned</Label>
                  <Textarea
                    placeholder="What should be repeated or improved next time?"
                    rows={3}
                    value={form.lessons_learned}
                    onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actual Budget + Donations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {budgetLines.length > 0 ? (
                <BudgetLineItems
                  items={budgetLines}
                  onChange={setBudgetLines}
                  showActual
                />
              ) : (
                <p className="text-sm text-gray-500">No budget lines were submitted on the EPF.</p>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-gray-600">Estimated Budget</p>
                  <p className="text-xl font-semibold text-green-700">${estimatedTotal.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-sm text-gray-600">Actual Spend</p>
                  <p className="text-xl font-semibold text-cyan-700">${actualTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Donations / Contributions Received</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.donations_received}
                    onChange={(e) => setForm({ ...form, donations_received: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Donation Notes</Label>
                  <Textarea
                    placeholder="Mention cash contributions, in-kind support, or sponsor support."
                    rows={2}
                    value={form.donation_notes}
                    onChange={(e) => setForm({ ...form, donation_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Budget Notes</Label>
                <Textarea
                  placeholder="Explain variance between planned and actual spend, pending reimbursements, or savings."
                  rows={3}
                  value={form.budget_notes}
                  onChange={(e) => setForm({ ...form, budget_notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Social Media + Report Content</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Social Media Writeup</Label>
                <Textarea
                  placeholder="Paste the final caption, messaging summary, or links to published posts."
                  rows={4}
                  value={form.social_media_writeup}
                  onChange={(e) => setForm({ ...form, social_media_writeup: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-Up Actions</Label>
                <Textarea
                  placeholder="Record next steps, referrals, promises made, or follow-up meetings."
                  rows={3}
                  value={form.follow_up_actions}
                  onChange={(e) => setForm({ ...form, follow_up_actions: e.target.value })}
                />
              </div>

              {userId && (
                <div className="space-y-2">
                  <Label>Images / Supporting Files</Label>
                  <FileUpload
                    eventId={id}
                    userId={userId}
                    fileType="report_image"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Submit Event Completion Report
          </Button>
        </form>
      </div>
    </div>
  )
}
