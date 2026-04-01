'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BudgetLineItems, type BudgetLine } from '@/components/events/BudgetLineItems'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Event, RegionOption, UserRole } from '@/types/database'

const EVENT_CODE_REGEX = /^[A-Z]{3}[A-Z]{3}[0-9]{2}$/
const GOALS = [
  'Awareness Campaign',
  'Community Outreach',
  'Capacity Building',
  'Fundraising',
  'Volunteer Engagement',
  'Partnership Development',
  'Monitoring & Evaluation',
]
const SOCIAL_CHANNELS = ['Facebook', 'Instagram', 'LinkedIn', 'WhatsApp', 'YouTube', 'Press']

function buildPreviewCode(region: string, eventDate: string) {
  const regionCode = region.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  const monthCode = eventDate
    ? new Date(`${eventDate}T00:00:00`).toLocaleString('en-US', { month: 'short' }).toUpperCase()
    : 'MON'
  return `${regionCode}${monthCode}01`
}

export default function EditEventPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [event, setEvent] = useState<Event | null>(null)
  const [profileRole, setProfileRole] = useState<UserRole | null>(null)
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [existingBudgetIds, setExistingBudgetIds] = useState<string[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [form, setForm] = useState({
    event_code: '',
    title: '',
    description: '',
    goal: GOALS[0],
    region: '',
    event_date: '',
    event_end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    venue_gmaps_link: '',
    expected_attendees: '',
    participant_profile: '',
    coordinator_name: '',
    coordinator_phone: '',
    coordinator_email: '',
    requires_budget: true,
    budget_justification: '',
    social_media_required: false,
    social_media_requirements: '',
    social_media_caption: '',
    social_media_channels: [] as string[],
  })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('events')
        .select('*, budgets(*)')
        .eq('id', id)
        .single()

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setProfileRole((profile?.role ?? null) as UserRole | null)
      }

      const { data: regionsData } = await supabase
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      setRegions((regionsData ?? []) as RegionOption[])

      if (!data) return
      setEvent(data)
      setExistingBudgetIds((data.budgets ?? []).map((line: BudgetLine) => line.id!).filter(Boolean))
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
      setForm({
        event_code: data.event_code || '',
        title: data.title || '',
        description: data.description || '',
        goal: data.goal || GOALS[0],
        region: data.region || '',
        event_date: data.event_date || '',
        event_end_date: data.event_end_date || '',
        start_time: data.start_time || '',
        end_time: data.end_time || '',
        location: data.location || '',
        venue_gmaps_link: data.venue_gmaps_link || '',
        expected_attendees: data.expected_attendees?.toString() || '',
        participant_profile: data.participant_profile || '',
        coordinator_name: data.coordinator_name || '',
        coordinator_phone: data.coordinator_phone || '',
        coordinator_email: data.coordinator_email || '',
        requires_budget: data.requires_budget,
        budget_justification: data.budget_justification || '',
        social_media_required: data.social_media_required,
        social_media_requirements: data.social_media_requirements || '',
        social_media_caption: data.social_media_caption || '',
        social_media_channels: data.social_media_channels || [],
      })
    }

    load()
  }, [id, supabase])

  useEffect(() => {
    if (!event || !form.region || !form.event_date) return
    if (profileRole !== 'admin') {
      setForm((current) => ({ ...current, event_code: event.event_code || buildPreviewCode(current.region, current.event_date) }))
    }
  }, [event, form.region, form.event_date, profileRole])

  const budgetLinesValid = useMemo(
    () => budgetLines.filter((line) => line.category && Number(line.estimated_amount) > 0),
    [budgetLines]
  )

  const toggleChannel = (channel: string) => {
    setForm((current) => ({
      ...current,
      social_media_channels: current.social_media_channels.includes(channel)
        ? current.social_media_channels.filter((item) => item !== channel)
        : [...current.social_media_channels, channel],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setLoading(true)
    setError('')

    const eventCode = form.event_code.trim().toUpperCase()
    if (profileRole === 'admin' && !EVENT_CODE_REGEX.test(eventCode)) {
      setError('Event code must use the format MUMFEB01.')
      setLoading(false)
      return
    }

    if (form.venue_gmaps_link && !/^https?:\/\/(www\.)?(maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(form.venue_gmaps_link)) {
      setError('Please enter a valid Google Maps link.')
      setLoading(false)
      return
    }

    const { error: eventError } = await supabase
      .from('events')
      .update({
        ...(profileRole === 'admin' ? { event_code: eventCode } : {}),
        title: form.title.trim(),
        description: form.description.trim() || null,
        goal: form.goal,
        region: form.region.trim(),
        event_date: form.event_date,
        event_end_date: form.event_end_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim(),
        venue_gmaps_link: form.venue_gmaps_link.trim() || null,
        expected_attendees: parseInt(form.expected_attendees, 10) || 0,
        participant_profile: form.participant_profile.trim() || null,
        coordinator_name: form.coordinator_name.trim() || null,
        coordinator_phone: form.coordinator_phone.trim() || null,
        coordinator_email: form.coordinator_email.trim() || null,
        requires_budget: form.requires_budget,
        budget_justification: form.budget_justification.trim() || null,
        social_media_required: form.social_media_required,
        social_media_channels: form.social_media_required ? form.social_media_channels : [],
        social_media_requirements: form.social_media_required ? form.social_media_requirements.trim() || null : null,
        social_media_caption: form.social_media_required ? form.social_media_caption.trim() || null : null,
      })
      .eq('id', id)

    if (eventError) {
      setError(eventError.message)
      setLoading(false)
      return
    }

    const validIds = new Set(budgetLinesValid.map((line) => line.id).filter(Boolean) as string[])
    const budgetIdsToDelete = existingBudgetIds.filter((budgetId) => !validIds.has(budgetId))
    if (budgetIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from('budgets').delete().in('id', budgetIdsToDelete)
      if (deleteError) {
        setError(deleteError.message)
        setLoading(false)
        return
      }
    }

    for (const line of budgetLinesValid) {
      if (line.id) {
        const { error: updateError } = await supabase
          .from('budgets')
          .update({
            category: line.category,
            description: line.description || null,
            justification: line.justification || null,
            estimated_amount: Number(line.estimated_amount) || 0,
          })
          .eq('id', line.id)
        if (updateError) {
          setError(updateError.message)
          setLoading(false)
          return
        }
      } else {
        const { error: insertError } = await supabase
          .from('budgets')
          .insert({
            event_id: id,
            category: line.category,
            description: line.description || null,
            justification: line.justification || null,
            estimated_amount: Number(line.estimated_amount) || 0,
          })
        if (insertError) {
          setError(insertError.message)
          setLoading(false)
          return
        }
      }
    }

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
          <h1 className="text-xl font-semibold">Edit Event Proposal</h1>
          <p className="text-sm text-gray-500">Changes stay editable while the workflow is still active.</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Event Code *</Label>
                  <Input value={form.event_code} onChange={(e) => setForm({ ...form, event_code: e.target.value.toUpperCase() })} readOnly={profileRole !== 'admin'} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Goal *</Label>
                  <select
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {GOALS.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Event Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Goal / Purpose</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Region *</Label>
                  <select
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select region</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.name}>{region.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Venue / Location *</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Venue Google Maps Link</Label>
                <Input value={form.venue_gmaps_link} onChange={(e) => setForm({ ...form, venue_gmaps_link: e.target.value })} placeholder="https://maps.google.com/..." />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={form.event_end_date} onChange={(e) => setForm({ ...form, event_end_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected Participants *</Label>
                  <Input type="number" min="1" value={form.expected_attendees} onChange={(e) => setForm({ ...form, expected_attendees: e.target.value })} required />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Participant Profile</Label>
                <Textarea rows={3} value={form.participant_profile} onChange={(e) => setForm({ ...form, participant_profile: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Budget</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Does this event require budget support? *</Label>
                <div className="flex gap-3">
                  <Button type="button" variant={form.requires_budget ? 'default' : 'outline'} onClick={() => setForm({ ...form, requires_budget: true })}>Yes</Button>
                  <Button type="button" variant={!form.requires_budget ? 'default' : 'outline'} onClick={() => setForm({ ...form, requires_budget: false })}>No</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Budget Rules / Justification *</Label>
                <Textarea rows={3} value={form.budget_justification} onChange={(e) => setForm({ ...form, budget_justification: e.target.value })} />
              </div>
              {form.requires_budget && (
                <BudgetLineItems items={budgetLines} onChange={setBudgetLines} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Coordinator Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Coordinator Name *</Label>
                <Input value={form.coordinator_name} onChange={(e) => setForm({ ...form, coordinator_name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Coordinator Phone</Label>
                <Input value={form.coordinator_phone} onChange={(e) => setForm({ ...form, coordinator_phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Coordinator Email *</Label>
                <Input type="email" value={form.coordinator_email} onChange={(e) => setForm({ ...form, coordinator_email: e.target.value })} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Social Media Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Will this event require social media coverage?</Label>
                <div className="flex gap-3">
                  <Button type="button" variant={form.social_media_required ? 'default' : 'outline'} onClick={() => setForm({ ...form, social_media_required: true })}>Yes</Button>
                  <Button type="button" variant={!form.social_media_required ? 'default' : 'outline'} onClick={() => setForm({ ...form, social_media_required: false, social_media_channels: [] })}>No</Button>
                </div>
              </div>

              {form.social_media_required && (
                <>
                  <div className="space-y-2">
                    <Label>Channels</Label>
                    <div className="flex flex-wrap gap-2">
                      {SOCIAL_CHANNELS.map((channel) => (
                        <Button key={channel} type="button" variant={form.social_media_channels.includes(channel) ? 'default' : 'outline'} size="sm" onClick={() => toggleChannel(channel)}>
                          {channel}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Requirements</Label>
                    <Textarea rows={3} value={form.social_media_requirements} onChange={(e) => setForm({ ...form, social_media_requirements: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Suggested Caption / Talking Points</Label>
                    <Textarea rows={3} value={form.social_media_caption} onChange={(e) => setForm({ ...form, social_media_caption: e.target.value })} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</div>}

          <div className="flex gap-3">
            <Button type="submit" loading={loading}>Save Changes</Button>
            <Link href={`/dashboard/events/${id}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
