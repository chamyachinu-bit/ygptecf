'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventStatus } from '@/types/database'

export function useEvents(filters?: { status?: EventStatus; myEvents?: boolean }) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('events')
      .select(`
        *,
        profiles:created_by(full_name, email, role, region),
        budgets(*)
      `)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (!error) setEvents(data ?? [])
    setLoading(false)
  }, [filters?.status, filters?.myEvents])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  return { events, loading, refetch: fetchEvents }
}

export function useEvent(id: string) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchEvent = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select(`
        *,
        profiles:created_by(full_name, email, role, region),
        budgets(*),
        approvals(*, profiles:reviewer_id(full_name, role)),
        files(*, profiles:uploaded_by(full_name))
      `)
      .eq('id', id)
      .single()
    setEvent(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchEvent() }, [fetchEvent])

  return { event, loading, refetch: fetchEvent }
}
