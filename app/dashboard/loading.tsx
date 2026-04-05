import { Mascot } from '@/components/branding/Mascot'
import { QuoteDisplay } from '@/components/ui/quote-display'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6">
      <Mascot size={96} className="animate-[float_3s_ease-in-out_infinite]" />

      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-900" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-emerald-600 border-r-emerald-500" />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] app-text-subtle">
          Loading workspace
        </p>
      </div>

      <div className="mt-2 w-full max-w-sm">
        <QuoteDisplay variant="light" intervalMs={4500} />
      </div>
    </div>
  )
}
