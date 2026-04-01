import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@react-pdf/renderer'
import { FinalReportPdfDocument } from '@/components/reports/FinalReportPdfDocument'
import { buildFinalReportViewModel } from '@/lib/reports/final-report-data'
import { createClient } from '@/lib/supabase/server'
import type { Budget, Event, EventReport, Profile } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: profileData }, { data: eventData }, { data: reportData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('events').select('*, budgets(*)').eq('id', id).single(),
    supabase.from('event_reports').select('*').eq('event_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const profile = profileData as Profile | null
  const event = eventData as Event | null
  const report = reportData as EventReport | null

  if (!profile || !event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!report) {
    return NextResponse.json({ error: 'Final report not available yet' }, { status: 409 })
  }

  const reportModel = buildFinalReportViewModel(
    {
      ...event,
      budgets: (event.budgets ?? []) as Budget[],
    },
    report
  )

  const buffer = await pdf(FinalReportPdfDocument({ reportModel })).toBuffer()
  const safeCode = event.event_code?.replace(/[^A-Za-z0-9_-]/g, '-') || 'event-report'

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeCode}-final-report.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
