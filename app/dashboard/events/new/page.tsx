'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BudgetLineItems, type BudgetLine } from '@/components/events/BudgetLineItems'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([
    { category: 'Venue', description: '', estimated_amount: 0 },
  ])
  const [form, setForm] = useState({
    title: '',
    description: '',
    region: '',
    event_date: '',
    event_end_date: '',
    location: '',
    expected_attendees: '',
  })

  const handleSubmit = async (e: React.FormEvent, asDraft = true) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    if (!asDraft && budgetLines.length === 0) {
      setError('Add at least one budget line before submitting.')
      setLoading(false)
      return
    }

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: form.title,
        description: form.description,
        region: form.region,
        event_date: form.event_date,
        event_end_date: form.event_end_date || null,
        location: form.location,
        expected_attendees: parseInt(form.expected_attendees) || 0,
        created_by: user.id,
        status: asDraft ? 'draft' : 'submitted',
        submitted_at: asDraft ? null : new Date().toISOString(),
        current_reviewer: asDraft ? null : 'events_team',
      })
      .select()
      .single()

    if (eventError || !event) {
      setError(eventError?.message || 'Failed to create event')
      setLoading(false)
      return
    }

    // Insert budget lines
    if (budgetLines.length > 0) {
      const validLines = budgetLines.filter(b => b.category && b.estimated_amount > 0)
      if (validLines.length > 0) {
        await supabase.from('budgets').insert(
          validLines.map(b => ({ ...b, event_id: event.id }))
        )
      }
    }

    router.push(`/dashboard/events/${event.id}`)
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard/events">
          <button className="p-1.5 rounded hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <h1 className="text-xl font-semibold">New Event Proposal</h1>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Community Health Awareness Workshop"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the event's purpose, target audience, and expected outcomes..."
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="region">Region *</Label>
                  <Input
                    id="region"
                    placeholder="e.g., East Africa"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Nairobi Community Centre"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="event_date">Start Date *</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event_end_date">End Date</Label>
                  <Input
                    id="event_end_date"
                    type="date"
                    value={form.event_end_date}
                    onChange={(e) => setForm({ ...form, event_end_date: e.target.value })}
                    min={form.event_date}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expected_attendees">Expected Attendees *</Label>
                  <Input
                    id="expected_attendees"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={form.expected_attendees}
                    onChange={(e) => setForm({ ...form, expected_attendees: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetLineItems items={budgetLines} onChange={setBudgetLines} />
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="outline"
              loading={loading}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              loading={loading}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
            >
              Submit for Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
