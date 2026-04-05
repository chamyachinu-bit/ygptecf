import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ enabled: false }, { status: 401 })
  }

  // Uses a security-definer function so any authenticated user can read
  // this one setting without exposing other sensitive app_settings fields.
  const { data, error } = await supabase.rpc('get_demo_autofill_enabled')

  if (error) {
    // Fallback: try reading directly via service client
    const { createServiceClient } = await import('@/lib/supabase/server')
    try {
      const service = await createServiceClient()
      const { data: settings } = await service
        .from('app_settings')
        .select('demo_autofill_enabled')
        .eq('id', 'global')
        .maybeSingle()
      return NextResponse.json({ enabled: Boolean(settings?.demo_autofill_enabled) })
    } catch {
      return NextResponse.json({ enabled: false })
    }
  }

  return NextResponse.json({ enabled: Boolean(data) })
}
