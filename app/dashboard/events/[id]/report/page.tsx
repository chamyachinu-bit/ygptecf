'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
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
import type { Event } from '@/types/database'

export default function ReportPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [event, setEvent] = useState<Event | null>(null)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    actual_attendees: '',
    outcome_summary: '',
    challenges: '',
    lessons_learned: '',
    budget_notes: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      const { data } = await supabase.from('events').select('*').eq('id', id).single()
      setEvent(data)
    }
    load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: reportError } = await supabase.from('event_reports').insert({
      event_id: id,
      submitted_by: userId,
      actual_attendees: parseInt(form.actual_attendees) || null,
      outcome_summary: form.outcome_summary || null,
      challenges: form.challenges || null,
      lessons_learned: form.lessons_learned || null,
      budget_notes: form.budget_notes || null,
    })

    if (reportError) {
      setError(reportError.message)
      setLoading(false)
      return
    }

    // Trigger auto-summary generation
    fetch('/api/events/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: id }),
    }).catch(() => {}) // Fire-and-forget

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
          <h1 className="text-lg font-semibold">Post-Event Report</h1>
          <p className="text-xs text-gray-500">{event.title}</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Event Outcomes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Actual Attendees</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={`Expected: ${event.expected_attendees}`}
                  value={form.actual_attendees}
                  onChange={(e) => setForm({ ...form, actual_attendees: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Outcome Summary *</Label>
                <Textarea
                  placeholder="Describe what was achieved, key highlights, and overall success..."
                  rows={4}
                  value={form.outcome_summary}
                  onChange={(e) => setForm({ ...form, outcome_summary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Challenges Faced</Label>
                <Textarea
                  placeholder="What challenges did you encounter?"
                  rows={3}
                  value={form.challenges}
                  onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lessons Learned</Label>
                <Textarea
                  placeholder="What would you do differently next time?"
                  rows={3}
                  value={form.lessons_learned}
                  onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Budget Notes</Label>
                <Textarea
                  placeholder="Notes on actual vs estimated spending..."
                  rows={2}
                  value={form.budget_notes}
                  onChange={(e) => setForm({ ...form, budget_notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {userId && (
            <Card>
              <CardHeader><CardTitle>Supporting Files</CardTitle></CardHeader>
              <CardContent>
                <FileUpload
                  eventId={id}
                  userId={userId}
                  fileType="report"
                />
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Submit Post-Event Report
          </Button>
        </form>
      </div>
    </div>
  )
}
