'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Bell,
  History,
  Users,
  BarChart3,
  Archive,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { ROLE_LABELS } from '@/lib/utils/permissions'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AppBrand } from '@/components/branding/AppBrand'

interface SidebarProps {
  profile: Profile
  unreadCount?: number
}

function getNavItems(profile: Profile, liveUnreadCount: number) {
  return [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/events', label: 'Events', icon: Calendar },
    { href: '/dashboard/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/history', label: 'History', icon: History },
    { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: liveUnreadCount },
    ...(profile.role === 'admin'
      ? [
          { href: '/dashboard/admin/users', label: 'Settings', icon: Users },
          { href: '/dashboard/admin/archived', label: 'Archived', icon: Archive },
        ]
      : []),
  ]
}

export function Sidebar({ profile, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount)

  useEffect(() => {
    setLiveUnreadCount(unreadCount)
  }, [unreadCount])

  useEffect(() => {
    const refreshUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
      setLiveUnreadCount(count ?? 0)
    }

    refreshUnreadCount()

    const channel = supabase
      .channel(`sidebar-notifications:${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        refreshUnreadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id, supabase])

  const navItems = getNavItems(profile, liveUnreadCount)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden min-h-screen w-[290px] shrink-0 border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))] text-white lg:flex lg:flex-col">
      <div className="px-6 py-6">
        <AppBrand compact dark />
      </div>

      <div className="mx-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-bold shadow-lg">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile.full_name}</p>
            <p className="truncate text-xs text-emerald-100/70">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/45">Workspace</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-[0_16px_30px_rgba(22,163,74,0.35)]'
                  : 'text-slate-200/88 hover:bg-white/8 hover:text-white'
              )}
            >
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent transition-colors',
                isActive ? 'bg-white/12 text-white' : 'bg-white/5 text-emerald-100/80 group-hover:bg-white/10'
              )}>
                <Icon className="h-4 w-4 flex-shrink-0" />
              </span>
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mx-4 mb-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-200/88 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

export function MobileNavigation({ profile, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount)

  useEffect(() => {
    setLiveUnreadCount(unreadCount)
  }, [unreadCount])

  useEffect(() => {
    const refreshUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
      setLiveUnreadCount(count ?? 0)
    }

    refreshUnreadCount()

    const channel = supabase
      .channel(`mobile-sidebar-notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          refreshUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id, supabase])

  const navItems = getNavItems(profile, liveUnreadCount).slice(0, 5)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <AppBrand compact />
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
              {ROLE_LABELS[profile.role]}
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 py-2 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
