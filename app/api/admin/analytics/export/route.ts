import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildAnalysisRows,
  filterAnalysisRows,
  toAnalyticsCsv,
  type EventWithAnalyticsRelations,
} from '@/lib/analytics/event-analytics'
import type { EventReport, Profile } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  let eventsQuery = supabase
    .from('events')
    .select('*, budgets(*), files(*)')
    .order('created_at', { ascending: false })

  if (profile.role === 'regional_coordinator') {
    eventsQuery = eventsQuery.eq('created_by', user.id)
  } else if (profile.role !== 'admin') {
    eventsQuery = eventsQuery.neq('status', 'draft')
  }

  const { data: eventsData } = await eventsQuery
  const events = (eventsData ?? []) as EventWithAnalyticsRelations[]
  const visibleEventIds = events.map((event) => event.id)

  const reportsResult = visibleEventIds.length
    ? await supabase.from('event_reports').select('*').in('event_id', visibleEventIds)
    : { data: [] as EventReport[] }

  const rows = buildAnalysisRows(events, (reportsResult.data ?? []) as EventReport[])
  const search = request.nextUrl.searchParams
  const filteredRows = filterAnalysisRows(rows, {
    q: search.get('q') ?? '',
    month: search.get('month') ?? '',
    region: search.get('region') ?? '',
    status: search.get('status') ?? '',
    goal: search.get('goal') ?? '',
    report_state: search.get('report_state') ?? '',
    budget_band: search.get('budget_band') ?? '',
    variance: search.get('variance') ?? '',
    sort: search.get('sort') ?? 'newest',
  })

  const csv = toAnalyticsCsv(filteredRows)
  const filename = `ygpt-event-analysis-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
