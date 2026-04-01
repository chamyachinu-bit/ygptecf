'use client'
import { Bell, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/types/database'

interface HeaderProps {
  title: string
  notifications?: Notification[]
  onMarkRead?: (id: string) => void
  canCreate?: boolean
}

export function Header({ title, notifications = [], onMarkRead, canCreate = false }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {canCreate && (
          <Link href="/dashboard/events/new">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </Link>
        )}
        <Link href="/dashboard/notifications">
          <div className="relative">
            <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </Link>
      </div>
    </header>
  )
}
