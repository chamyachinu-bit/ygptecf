'use client'
import { Bell, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/types/database'
import { PageHero } from '@/components/ui/page-shell'

interface HeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  notifications?: Notification[]
  onMarkRead?: (id: string) => void
  canCreate?: boolean
}

export function Header({ title, subtitle, eyebrow, notifications = [], onMarkRead, canCreate = false }: HeaderProps) {
  return (
    <PageHero
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={
        <>
          {canCreate && (
            <Link href="/dashboard/events/new">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New Event
              </Button>
            </Link>
          )}
          <Link href="/dashboard/notifications">
            <button className="relative rounded-xl border border-white/15 bg-white/10 p-2.5 app-text-inverse-muted transition-colors hover:bg-white/20">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-red-400" />
              )}
            </button>
          </Link>
        </>
      }
    >
      <div className="grid gap-3 text-sm app-text-inverse-muted">
        <p>
          Use this workspace to stay on top of approvals, reporting, budgeting, and operational follow-up.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-emerald-100/80">
          <span>Production workspace</span>
          <span>Role-aware visibility</span>
          <span>Drive-linked operations</span>
        </div>
      </div>
    </PageHero>
  )
}
