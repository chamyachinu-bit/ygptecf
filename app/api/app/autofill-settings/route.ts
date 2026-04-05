import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ enabled: false }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // Try security-definer RPC first (works for any authenticated user)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_demo_autofill_enabled')

  if (!rpcError && rpcData !== null) {
    return NextResponse.json({ enabled: Boolean(rpcData) }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }

  // Fallback: service client bypasses RLS
  try {
    const service = await createServiceClient()
    const { data: settings } = await service
      .from('app_settings')
      .select('demo_autofill_enabled')
      .eq('id', 'global')
      .maybeSingle()
    return NextResponse.json({ enabled: Boolean(settings?.demo_autofill_enabled) }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch {
    return NextResponse.json({ enabled: false }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
