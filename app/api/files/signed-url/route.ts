import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path } = await request.json()
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('id')
      .eq('storage_path', path)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await serviceSupabase.storage
      .from('event-files')
      .createSignedUrl(path, 3600) // 1 hour expiry

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ url: data.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
