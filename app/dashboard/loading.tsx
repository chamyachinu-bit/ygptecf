export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-emerald-600 border-r-emerald-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Loading workspace</p>
        <p className="mt-2 text-sm text-slate-600">This can feel slower on local development while the server renders the next page.</p>
      </div>
    </div>
  )
}
