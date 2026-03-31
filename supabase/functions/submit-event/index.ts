import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVENT_CODE_REGEX = /^[A-Z]{3}[A-Z]{3}[0-9]{2}$/

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  try {
    const { event_id } = await req.json()
    if (!event_id) return new Response('event_id required', { status: 400 })

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, budgets(*)')
      .eq('id', event_id)
      .eq('created_by', user.id)
      .eq('status', 'draft')
      .single()

    if (eventError || !event) {
      return new Response('Event not found or not in draft', { status: 404 })
    }

    const errors: string[] = []
    if (!event.event_code || !EVENT_CODE_REGEX.test(event.event_code)) errors.push('Event code must use the format MUMFEB01')
    if (!event.title?.trim()) errors.push('Title is required')
    if (!event.goal?.trim()) errors.push('Goal is required')
    if (!event.event_date) errors.push('Event date is required')
    if (!event.location?.trim()) errors.push('Venue is required')
    if (!event.region?.trim()) errors.push('Region is required')
    if (!event.coordinator_name?.trim()) errors.push('Coordinator name is required')
    if (!event.coordinator_email?.trim()) errors.push('Coordinator email is required')
    if (!event.expected_attendees || event.expected_attendees <= 0) errors.push('Expected participants must be greater than 0')
    if (!event.requires_budget && !event.budget_justification?.trim()) {
      errors.push('Budget justification is required when no budget is requested')
    }
    if (event.requires_budget && (!event.budgets || event.budgets.length === 0)) {
      errors.push('At least one budget line is required')
    }
    if (event.social_media_required && (!event.social_media_channels || event.social_media_channels.length === 0)) {
      errors.push('At least one social media channel is required when social media is requested')
    }

    if (event.event_date) {
      const eventDate = new Date(event.event_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (eventDate < today) errors.push('Event date cannot be in the past')
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ errors }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        current_reviewer: 'events_team',
      })
      .eq('id', event_id)

    if (updateError) {
      return new Response(updateError.message, { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, message: 'Event submitted for review' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response('Internal error', { status: 500 })
  }
})
