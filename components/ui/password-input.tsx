'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(
            'app-field flex h-11 w-full rounded-2xl px-4 pr-12 text-sm outline-none transition',
            className
          )}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
          className="app-text-subtle absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg p-1.5 transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text-strong)]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
