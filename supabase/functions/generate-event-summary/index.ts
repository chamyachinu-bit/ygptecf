import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const { event_id } = await req.json()
    if (!event_id) return new Response('event_id required', { status: 400 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: event, error } = await supabase
      .from('events')
      .select('*, budgets(*), event_reports(*), approvals(*), profiles:created_by(full_name, region)')
      .eq('id', event_id)
      .single()

    if (error || !event) return new Response('Event not found', { status: 404 })

    const report = event.event_reports?.[0]
    const budgets = event.budgets ?? []
    const approvals = event.approvals ?? []

    const totalEstimated = budgets.reduce((sum: number, line: { estimated_amount: number }) => sum + Number(line.estimated_amount || 0), 0)
    const totalActual = budgets.reduce(
      (sum: number, line: { actual_amount?: number; estimated_amount: number }) =>
        sum + Number(line.actual_amount ?? line.estimated_amount ?? 0),
      0
    )
    const variance = totalActual - totalEstimated
    const variancePct = totalEstimated > 0 ? ((variance / totalEstimated) * 100).toFixed(1) : '0.0'

    const summary = [
      'EVENT SUMMARY REPORT',
      '====================',
      `Event: ${event.event_code} - ${event.title}`,
      `Goal: ${event.goal ?? 'Not specified'}`,
      `Region: ${event.region}`,
      `Planned Venue: ${event.location}`,
      `Actual Venue: ${report?.actual_location ?? event.location}`,
      `Dates: ${event.event_date}${event.event_end_date ? ` to ${event.event_end_date}` : ''}`,
      `Time: ${event.start_time ?? 'TBD'} - ${event.end_time ?? 'TBD'}`,
      `Actual Time: ${report?.actual_start_time ?? 'TBD'} - ${report?.actual_end_time ?? 'TBD'}`,
      `Submitted by: ${(event.profiles as { full_name?: string })?.full_name ?? 'Unknown'}`,
      '',
      'ATTENDANCE',
      `Expected: ${event.expected_attendees}`,
      `Actual: ${report?.actual_attendees ?? 'Not reported'}`,
      '',
      'BUDGET',
      `Estimated: $${totalEstimated.toFixed(2)}`,
      `Actual: $${totalActual.toFixed(2)}`,
      `Variance: $${variance.toFixed(2)} (${variancePct}%)`,
      `Donations Received: $${Number(report?.donations_received ?? 0).toFixed(2)}`,
      '',
      'APPROVALS',
      `Completed Stages: ${approvals.length}/3`,
      ...approvals.map((approval: { stage: string; decision: string; decided_at: string }) =>
        `- ${approval.stage}: ${approval.decision} on ${new Date(approval.decided_at).toISOString()}`
      ),
      '',
      'EXECUTION',
      report?.execution_details || 'Not provided',
      '',
      'OUTCOMES',
      report?.outcome_summary || 'Not provided',
      '',
      'CHALLENGES',
      report?.challenges || 'Not provided',
      '',
      'LESSONS LEARNED',
      report?.lessons_learned || 'Not provided',
      '',
      'SOCIAL MEDIA',
      report?.social_media_writeup || event.social_media_caption || 'Not provided',
      '',
      'FOLLOW-UP ACTIONS',
      report?.follow_up_actions || 'Not provided',
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n')

    await supabase
      .from('event_reports')
      .update({ auto_summary: summary })
      .eq('event_id', event_id)

    return new Response(JSON.stringify({ summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response('Internal error', { status: 500 })
  }
})
