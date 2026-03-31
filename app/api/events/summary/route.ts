import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { event_id } = await request.json()
    if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

    const supabase = await createServiceClient()

    const { data: event } = await supabase
      .from('events')
      .select('*, budgets(*), event_reports(*), approvals(*)')
      .eq('id', event_id)
      .single()

    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const budgetTotal = (event.budgets ?? []).reduce(
      (sum: number, b: { actual_amount?: number; estimated_amount: number }) =>
        sum + (b.actual_amount ?? b.estimated_amount),
      0
    )

    const report = event.event_reports?.[0]

    const summary = [
      `EVENT SUMMARY REPORT`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Event: ${event.title}`,
      `Region: ${event.region} | Location: ${event.location}`,
      `Date: ${event.event_date}${event.event_end_date ? ` to ${event.event_end_date}` : ''}`,
      `Attendees: ${report?.actual_attendees ?? 'N/A'} (expected: ${event.expected_attendees})`,
      `Total Spend: $${budgetTotal.toFixed(2)}`,
      `Approval stages: ${event.approvals?.length ?? 0}`,
      `Status: ${event.status}`,
      report?.outcome_summary ? `\nOutcome: ${report.outcome_summary}` : '',
      report?.challenges ? `Challenges: ${report.challenges}` : '',
      report?.lessons_learned ? `Lessons: ${report.lessons_learned}` : '',
    ].filter(Boolean).join('\n')

    await supabase
      .from('event_reports')
      .update({ auto_summary: summary })
      .eq('event_id', event_id)

    return NextResponse.json({ summary })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
