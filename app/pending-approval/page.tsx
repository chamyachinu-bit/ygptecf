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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center">
          <AppBrand />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Hello {profile?.full_name || user.email}, {message}
            </p>
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
  )
}
