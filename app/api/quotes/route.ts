import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_QUOTES } from '@/lib/quotes'

export async function GET() {
  try {
    const service = await createServiceClient()
    const { data } = await service
      .from('quotes')
      .select('id, text, author, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (data && data.length > 0) {
      return NextResponse.json(data)
    }
  } catch {
    // fall through to defaults
  }

  return NextResponse.json(DEFAULT_QUOTES)
}
