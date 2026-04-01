import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status, is_active')
      .eq('id', user.id)
      .maybeSingle()

    const isPendingApproval = profile?.approval_status && profile.approval_status !== 'approved'
    const isDisabled = profile && profile.is_active === false

    if ((isPendingApproval || isDisabled) && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/pending-approval'
      return NextResponse.redirect(url)
    }

    if ((isPendingApproval || isDisabled) && pathname !== '/pending-approval' && pathname !== '/login' && pathname !== '/register') {
      const url = request.nextUrl.clone()
      url.pathname = '/pending-approval'
      return NextResponse.redirect(url)
    }

    if (!isPendingApproval && !isDisabled && pathname === '/pending-approval') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (
    user &&
    (pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
