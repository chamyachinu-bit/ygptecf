import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/formatters'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-[0_14px_28px_rgba(22,163,74,0.18)] hover:-translate-y-0.5 hover:from-green-700 hover:to-emerald-700 hover:shadow-[0_18px_34px_rgba(22,163,74,0.24)]',
        destructive: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_14px_28px_rgba(244,63,94,0.16)] hover:-translate-y-0.5 hover:from-red-600 hover:to-rose-600 hover:shadow-[0_18px_34px_rgba(244,63,94,0.22)]',
        outline: 'border border-slate-200 bg-white/95 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md',
        secondary: 'bg-slate-100 text-slate-900 shadow-sm hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-md',
        ghost: 'text-slate-700 hover:-translate-y-0.5 hover:bg-slate-100',
        link: 'text-green-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
