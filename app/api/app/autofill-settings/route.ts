import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ enabled: false }, { status: 401 })
  }

  const service = await createServiceClient()
  const { data: settings } = await service
    .from('app_settings')
    .select('demo_autofill_enabled')
    .eq('id', 'global')
    .maybeSingle()

  return NextResponse.json({
    enabled: Boolean(settings?.demo_autofill_enabled),
  })
}
