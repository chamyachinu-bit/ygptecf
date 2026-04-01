import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setupEventDriveLinks } from '@/lib/drive/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = (await request.json()) as { eventId?: string }
  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  const [{ data: profile }, { data: event }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('events').select('id, created_by').eq('id', eventId).single(),
  ])

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.created_by !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await setupEventDriveLinks(eventId, user.id)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
