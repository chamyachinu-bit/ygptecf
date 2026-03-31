import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  // Verify user JWT
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  try {
    const { event_id } = await req.json()
    if (!event_id) return new Response('event_id required', { status: 400 })

    // Validate event belongs to user and is in draft
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

    // Validation checks
    const errors: string[] = []
    if (!event.title?.trim()) errors.push('Title is required')
    if (!event.event_date) errors.push('Event date is required')
    if (!event.location?.trim()) errors.push('Location is required')
    if (!event.region?.trim()) errors.push('Region is required')
    if (!event.budgets || event.budgets.length === 0) errors.push('At least one budget line is required')
    if (event.expected_attendees <= 0) errors.push('Expected attendees must be greater than 0')

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

    // Submit the event
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
