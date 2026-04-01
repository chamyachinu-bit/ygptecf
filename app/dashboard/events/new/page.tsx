'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
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
import { can, ROLE_LABELS } from '@/lib/utils/permissions'
import type { RegionOption, UserRole } from '@/types/database'

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

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profileRole, setProfileRole] = useState<UserRole | null>(null)
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([
    { category: 'Venue', description: '', justification: '', estimated_amount: 0, actual_amount: null },
  ])
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
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone, region, role')
        .eq('id', user.id)
        .single()

      const { data: regionsData } = await supabase
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (profile) {
        setProfileRole(profile.role as UserRole)
        if (!can(profile.role as UserRole, 'events:create')) {
          router.replace('/dashboard')
          return
        }
        setForm((current) => ({
          ...current,
          coordinator_name: current.coordinator_name || profile.full_name || '',
          coordinator_email: current.coordinator_email || profile.email || '',
          coordinator_phone: current.coordinator_phone || profile.phone || '',
          region: current.region || profile.region || '',
        }))
      }
      setRegions((regionsData ?? []) as RegionOption[])
    }

    loadProfile()
  }, [router, supabase])

  useEffect(() => {
    if (!form.region) return
    const preview = buildPreviewCode(form.region, form.event_date)
    if (profileRole !== 'admin') {
      setForm((current) => ({ ...current, event_code: preview }))
    } else if (!form.event_code) {
      setForm((current) => ({ ...current, event_code: preview }))
    }
  }, [form.region, form.event_date, profileRole])

  const budgetLinesValid = useMemo(
    () => budgetLines.filter((line) => line.category && Number(line.estimated_amount) > 0),
    [budgetLines]
  )

  const handleAutofill = () => {
    const now = new Date()
    const future = new Date(now)
    future.setDate(now.getDate() + 7)
    const eventMonth = future.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    const uniqueSuffix = String((future.getDate() + now.getMinutes()) % 100).padStart(2, '0')
    const regions = ['Pune', 'Mumbai', 'Nashik', 'Nagpur']
    const goals = ['Capacity Building', 'Community Outreach', 'Awareness Campaign', 'Volunteer Engagement']
    const venues = ['Shivajinagar Community Hall', 'Aundh Training Centre', 'Kothrud Workshop Space', 'Pimpri Youth Centre']
    const pickedRegion = regions[now.getSeconds() % regions.length]
    const pickedGoal = goals[now.getSeconds() % goals.length]
    const pickedVenue = venues[now.getSeconds() % venues.length]

    setForm((current) => ({
      ...current,
      event_code: `${pickedRegion.slice(0, 3).toUpperCase()}${eventMonth}${uniqueSuffix}`,
      title: `${pickedGoal} Session ${future.getDate()}`,
      description: `A focused NGO field event for ${pickedGoal.toLowerCase()} with practical activities, volunteer coordination, and measurable participant outcomes.`,
      goal: pickedGoal,
      region: pickedRegion,
      event_date: future.toISOString().split('T')[0],
      event_end_date: future.toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '16:00',
      location: pickedVenue,
      venue_gmaps_link: 'https://maps.google.com/?q=Shivajinagar+Community+Hall+Pune',
      expected_attendees: String(60 + (now.getSeconds() % 50)),
      participant_profile: 'Community volunteers, youth leaders, local NGO staff, and beneficiary representatives.',
      coordinator_name: current.coordinator_name || 'Nakul Kokate',
      coordinator_phone: current.coordinator_phone || '9876543210',
      coordinator_email: current.coordinator_email || 'kokatenakul11@gmail.com',
      requires_budget: true,
      budget_justification: 'Budget needed for venue, refreshments, printed material, and local transport support.',
      social_media_required: true,
      social_media_requirements: 'Need 8 to 10 photos, one short reel, and a same-day impact update for NGO channels.',
      social_media_caption: `Building momentum through ${pickedGoal.toLowerCase()} in ${pickedRegion} with local partners and volunteers.`,
      social_media_channels: ['Facebook', 'Instagram', 'WhatsApp'],
    }))

    setBudgetLines([
      { category: 'Venue', description: 'Hall booking', justification: 'Indoor space for full workshop day', estimated_amount: 12000, actual_amount: null },
      { category: 'Catering', description: 'Lunch and tea', justification: 'Refreshments for participants and volunteers', estimated_amount: 18000, actual_amount: null },
      { category: 'Printing', description: 'Worksheets and handouts', justification: 'Participant learning material', estimated_amount: 7000, actual_amount: null },
      { category: 'Transport', description: 'Volunteer travel support', justification: 'Field team local commute', estimated_amount: 5000, actual_amount: null },
    ])
  }

  const toggleChannel = (channel: string) => {
    setForm((current) => ({
      ...current,
      social_media_channels: current.social_media_channels.includes(channel)
        ? current.social_media_channels.filter((item) => item !== channel)
        : [...current.social_media_channels, channel],
    }))
  }

  const handleSubmit = async (e: React.FormEvent, asDraft = true) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const eventCode = form.event_code.trim().toUpperCase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

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

    if (!form.requires_budget && !form.budget_justification.trim()) {
      setError('Explain why no budget is required for this proposal.')
      setLoading(false)
      return
    }

    if (form.requires_budget && !asDraft && budgetLinesValid.length === 0) {
      setError('Add at least one valid budget line before submitting.')
      setLoading(false)
      return
    }

    if (form.social_media_required && form.social_media_channels.length === 0) {
      setError('Select at least one social media channel when promotion is required.')
      setLoading(false)
      return
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
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

    if (form.requires_budget && budgetLinesValid.length > 0) {
      const { error: budgetError } = await supabase.from('budgets').insert(
        budgetLinesValid.map((line) => ({
          event_id: event.id,
          category: line.category,
          description: line.description || null,
          justification: line.justification || null,
          estimated_amount: Number(line.estimated_amount) || 0,
        }))
      )

      if (budgetError) {
        setError(budgetError.message)
        setLoading(false)
        return
      }
    }

    router.push(`/dashboard/events/${event.id}`)
  }

  if (profileRole && !can(profileRole, 'events:create')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">
              {ROLE_LABELS[profileRole]} does not have permission to create events.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard/events">
          <button className="p-1.5 rounded hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">New Event Proposal</h1>
          <p className="text-sm text-gray-500">Build the full EPF before moving it into review.</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={handleAutofill}>
              Autofill Test Data
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="event_code">Event Code *</Label>
                  <Input
                    id="event_code"
                    placeholder="MUMFEB01"
                    value={form.event_code}
                    onChange={(e) => setForm({ ...form, event_code: e.target.value.toUpperCase() })}
                    readOnly={profileRole !== 'admin'}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {profileRole === 'admin'
                      ? 'Admin can override the auto-generated code.'
                      : 'This code is auto-generated from region and month.'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal">Goal *</Label>
                  <select
                    id="goal"
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {GOALS.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
                  </select>
                </div>
              </div>

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
                <Label htmlFor="description">Goal / Purpose</Label>
                <Textarea
                  id="description"
                  placeholder="Summarize the event purpose, expected change, and why the NGO is running it."
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="region">Region *</Label>
                  <select
                    id="region"
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
                  <Label htmlFor="location">Venue / Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Andheri Community Hall"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="venue_gmaps_link">Venue Google Maps Link</Label>
                <Input
                  id="venue_gmaps_link"
                  placeholder="https://maps.google.com/..."
                  value={form.venue_gmaps_link}
                  onChange={(e) => setForm({ ...form, venue_gmaps_link: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
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
                    min={form.event_date || undefined}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expected_attendees">Expected Participants *</Label>
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="participant_profile">Participant Profile</Label>
                <Textarea
                  id="participant_profile"
                  placeholder="Who will attend? Mention audience segments, age bands, partner organizations, or beneficiary groups."
                  rows={3}
                  value={form.participant_profile}
                  onChange={(e) => setForm({ ...form, participant_profile: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Does this event require budget support? *</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={form.requires_budget ? 'default' : 'outline'}
                    onClick={() => setForm({ ...form, requires_budget: true })}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={!form.requires_budget ? 'default' : 'outline'}
                    onClick={() => setForm({ ...form, requires_budget: false })}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget_justification">Budget Rules / Justification *</Label>
                <Textarea
                  id="budget_justification"
                  placeholder="Explain the spending logic, approvals needed, donation match, or why no budget is needed."
                  rows={3}
                  value={form.budget_justification}
                  onChange={(e) => setForm({ ...form, budget_justification: e.target.value })}
                />
              </div>

              {form.requires_budget && (
                <BudgetLineItems items={budgetLines} onChange={setBudgetLines} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coordinator Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="coordinator_name">Coordinator Name *</Label>
                <Input
                  id="coordinator_name"
                  value={form.coordinator_name}
                  onChange={(e) => setForm({ ...form, coordinator_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coordinator_phone">Coordinator Phone</Label>
                <Input
                  id="coordinator_phone"
                  value={form.coordinator_phone}
                  onChange={(e) => setForm({ ...form, coordinator_phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coordinator_email">Coordinator Email *</Label>
                <Input
                  id="coordinator_email"
                  type="email"
                  value={form.coordinator_email}
                  onChange={(e) => setForm({ ...form, coordinator_email: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Will this event require social media coverage?</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={form.social_media_required ? 'default' : 'outline'}
                    onClick={() => setForm({ ...form, social_media_required: true })}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={!form.social_media_required ? 'default' : 'outline'}
                    onClick={() => setForm({ ...form, social_media_required: false, social_media_channels: [] })}
                  >
                    No
                  </Button>
                </div>
              </div>

              {form.social_media_required && (
                <>
                  <div className="space-y-2">
                    <Label>Channels</Label>
                    <div className="flex flex-wrap gap-2">
                      {SOCIAL_CHANNELS.map((channel) => (
                        <Button
                          key={channel}
                          type="button"
                          variant={form.social_media_channels.includes(channel) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleChannel(channel)}
                        >
                          {channel}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="social_media_requirements">Requirements</Label>
                    <Textarea
                      id="social_media_requirements"
                      placeholder="Mention photographer needs, posting deadlines, approvals, and mandatory deliverables."
                      rows={3}
                      value={form.social_media_requirements}
                      onChange={(e) => setForm({ ...form, social_media_requirements: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="social_media_caption">Suggested Caption / Talking Points</Label>
                    <Textarea
                      id="social_media_caption"
                      placeholder="Draft the key message the NGO wants used in social media posts."
                      rows={3}
                      value={form.social_media_caption}
                      onChange={(e) => setForm({ ...form, social_media_caption: e.target.value })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</div>
          )}

          <div className="flex gap-3">
            <Button type="submit" variant="outline" loading={loading}>
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
