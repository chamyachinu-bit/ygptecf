import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/formatters'

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('app-shell-grid p-6 md:p-8', className)}>{children}</div>
}

export function PageHero({
  lead,
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  lead?: ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="app-hero overflow-hidden rounded-[1.8rem] border app-border-soft shadow-[0_24px_60px_rgba(15,23,42,0.15)]">
      <div className="grid gap-6 px-6 py-7 md:px-8 md:py-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          {lead ? <div className="flex items-start">{lead}</div> : null}
          {eyebrow && (
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] app-text-inverse-muted">
              {eyebrow}
            </div>
          )}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight app-text-inverse md:text-3xl">{title}</h1>
            {subtitle ? <p className="max-w-3xl text-sm leading-6 app-text-inverse-muted md:text-base">{subtitle}</p> : null}
          </div>
        </div>
        {(actions || children) && (
          <div className="space-y-4 rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm md:p-5">
            {actions ? <div className="flex flex-wrap justify-start gap-2 lg:justify-end">{actions}</div> : null}
            {children}
          </div>
        )}
      </div>
    </section>
  )
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
}

export function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <div className="app-panel rounded-[1.3rem] p-5">
      <p className="app-text-subtle text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="app-text-strong mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {helper ? <p className="app-text-muted mt-2 text-sm">{helper}</p> : null}
    </div>
  )
}

export function SectionBlock({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="app-page-section">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b app-border-soft px-6 py-5 md:px-7">
        <div>
          <h2 className="app-text-strong text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="app-text-muted mt-1 text-sm">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-6 md:p-7">{children}</div>
    </section>
  )
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="app-panel-muted rounded-[1.5rem] border border-dashed px-6 py-12 text-center">
      <h3 className="app-text-strong text-lg font-semibold">{title}</h3>
      <p className="app-text-muted mx-auto mt-2 max-w-2xl text-sm leading-6">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
