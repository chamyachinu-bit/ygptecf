import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AppBrand } from '@/components/branding/AppBrand'

export default async function PendingApprovalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('approval_status, is_active, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.approval_status === 'approved' && profile?.is_active !== false) {
    redirect('/dashboard')
  }

  const title = profile?.is_active === false ? 'Account Disabled' : 'Waiting for Admin Approval'
  const message = profile?.is_active === false
    ? 'Your account has been disabled by an administrator. Please contact the admin team if you believe this is a mistake.'
    : 'Your account has been created successfully, but dashboard access is blocked until an admin approves your registration.'

  return (
    <div className="min-h-screen bg-transparent px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-emerald-900 to-green-800 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <AppBrand dark />
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/90">
                Access control
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight">
                Your account is created, but dashboard access is controlled by admin approval.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-emerald-50/85">
                This keeps workflow roles, sensitive approvals, and operational data protected while new users are reviewed.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <PendingFeature title="Verified access" body="Only approved users can enter the working dashboard and operational views." />
            <PendingFeature title="Role-safe onboarding" body="Admin approval keeps high-trust workflows aligned with the right teams." />
            <PendingFeature title="Operational readiness" body="Once approved, your role-specific dashboard and event workspace become available immediately." />
          </div>
        </section>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-center lg:hidden">
              <AppBrand />
            </div>

            <Card className="overflow-hidden">
              <div className="app-panel-soft border-b app-border-soft px-6 py-5">
                <CardTitle>{title}</CardTitle>
              </div>
              <CardContent className="space-y-4 pt-6">
                <p className="app-text-muted text-sm leading-6">
                  Hello {profile?.full_name || user.email}, {message}
                </p>
                <div className="app-panel-soft rounded-xl p-4 text-sm app-text-muted">
                  You can close this page for now and return after the admin team confirms your access.
                </div>
                <form
                  action={async () => {
                    'use server'
                    const { createClient: createServerClient } = await import('@/lib/supabase/server')
                    const scopedSupabase = await createServerClient()
                    await scopedSupabase.auth.signOut()
                    redirect('/login')
                  }}
                >
                  <Button type="submit" variant="outline" className="w-full">
                    Sign Out
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function PendingFeature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-emerald-50/85">{body}</p>
    </div>
  )
}
