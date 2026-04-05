import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { MobileNavigation, Sidebar } from '@/components/layout/Sidebar'
import { NavigationLoadingBar } from '@/components/ui/nav-loading'
import type { Profile } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch unread notification count
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex min-h-screen bg-transparent">
      <Suspense fallback={null}>
        <NavigationLoadingBar />
      </Suspense>
      <Sidebar profile={profile as Profile} unreadCount={count ?? 0} />
      <main className="flex-1 overflow-auto pb-24 lg:pb-0">
        <MobileNavigation profile={profile as Profile} unreadCount={count ?? 0} />
        {children}
      </main>
    </div>
  )
}
