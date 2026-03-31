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

    const totalEstimated = budgets.reduce((s: number, b: { estimated_amount: number }) => s + b.estimated_amount, 0)
    const totalActual = budgets.reduce((s: number, b: { actual_amount?: number; estimated_amount: number }) => s + (b.actual_amount ?? b.estimated_amount), 0)
    const variance = totalActual - totalEstimated
    const variancePct = totalEstimated > 0 ? ((variance / totalEstimated) * 100).toFixed(1) : '0'

    const budgetHealth = Math.abs(Number(variancePct)) <= 10
      ? 'GOOD (within 10%)'
      : Number(variancePct) > 0
        ? `OVER BUDGET (+${variancePct}%)`
        : `UNDER BUDGET (${variancePct}%)`

    const summary = `
╔══════════════════════════════════════╗
║         EVENT SUMMARY REPORT         ║
╚══════════════════════════════════════╝

EVENT INFORMATION
─────────────────
Title    : ${event.title}
Region   : ${event.region}
Location : ${event.location}
Date     : ${event.event_date}${event.event_end_date ? ` to ${event.event_end_date}` : ''}
Status   : ${event.status.toUpperCase()}
Submitted by: ${(event.profiles as { full_name: string })?.full_name}

ATTENDANCE
──────────
Expected  : ${event.expected_attendees}
Actual    : ${report?.actual_attendees ?? 'Not reported'}
${report?.actual_attendees ? `Variance  : ${report.actual_attendees - event.expected_attendees} (${(((report.actual_attendees - event.expected_attendees) / event.expected_attendees) * 100).toFixed(0)}%)` : ''}

BUDGET
──────
Estimated : $${totalEstimated.toFixed(2)}
Actual    : $${totalActual.toFixed(2)}
Budget Health: ${budgetHealth}
Line Items: ${budgets.length}

APPROVAL CHAIN
──────────────
Stages Completed: ${approvals.length}/3
${approvals.map((a: { stage: string; decision: string; decided_at: string }) =>
  `  ✓ ${a.stage.replace(/_/g, ' ').toUpperCase()} — ${a.decision} (${new Date(a.decided_at).toLocaleDateString()})`
).join('\n')}

${report ? `OUTCOMES
────────
${report.outcome_summary || 'Not provided'}

${report.challenges ? `CHALLENGES\n──────────\n${report.challenges}` : ''}

${report.lessons_learned ? `LESSONS LEARNED\n───────────────\n${report.lessons_learned}` : ''}` : 'POST-EVENT REPORT: Not yet submitted'}

Generated: ${new Date().toISOString()}
`.trim()

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
