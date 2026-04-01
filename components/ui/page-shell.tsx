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
    <section className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-gradient-to-r from-slate-950 via-emerald-900 to-green-800 text-white shadow-[0_24px_60px_rgba(15,23,42,0.15)]">
      <div className="grid gap-6 px-6 py-7 md:px-8 md:py-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          {lead ? <div className="flex items-start">{lead}</div> : null}
          {eyebrow && (
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/90">
              {eyebrow}
            </div>
          )}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h1>
            {subtitle && <p className="max-w-3xl text-sm leading-6 text-emerald-50/90 md:text-base">{subtitle}</p>}
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
    <div className="rounded-[1.3rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
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
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 md:px-7">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
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
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/90 px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
