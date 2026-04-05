'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils/formatters'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = theme ?? 'system'
  const ActiveIcon =
    !mounted || activeTheme === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun
  const activeLabel = !mounted
    ? 'System'
    : activeTheme === 'system'
      ? 'System'
      : activeTheme === 'dark'
        ? 'Dark'
        : 'Light'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Change theme"
          className={cn(
            'app-nav-button inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium app-text transition-all hover:-translate-y-0.5',
            compact ? 'h-10 w-10 justify-center px-0' : '',
            className
          )}
        >
          <ActiveIcon className="h-4 w-4" />
          {!compact ? <span>{activeLabel}</span> : null}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="app-menu z-[90] min-w-[10rem] rounded-2xl p-2 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon
            const isActive = activeTheme === option.value
            return (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => setTheme(option.value)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none transition',
                  isActive ? 'app-menu-item-active' : 'app-menu-item'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
