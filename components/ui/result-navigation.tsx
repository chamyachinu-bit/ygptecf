import Link from 'next/link'

const SIZE_OPTIONS = [10, 25, 50, 100] as const

type QueryValue = string | number | null | undefined

function buildHref(
  pathname: string,
  current: Record<string, QueryValue>,
  updates: Record<string, QueryValue>,
  anchorId?: string
) {
  const params = new URLSearchParams()
  const merged = { ...current, ...updates }

  Object.entries(merged).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    params.set(key, String(value))
  })

  const query = params.toString()
  const base = query ? `${pathname}?${query}` : pathname
  return anchorId ? `${base}#${anchorId}` : base
}

export function ResultNavigation({
  pathname,
  query,
  sizeParam,
  pageParam,
  currentSize,
  currentPage,
  totalCount,
  label,
  anchorId,
}: {
  pathname: string
  query: Record<string, QueryValue>
  sizeParam: string
  pageParam: string
  currentSize: number
  currentPage: number
  totalCount: number
  label: string
  anchorId?: string
}) {
  const safeTotal = Math.max(totalCount, 0)
  const pageCount = Math.max(1, Math.ceil(safeTotal / currentSize))
  const safePage = Math.min(Math.max(currentPage, 1), pageCount)
  const start = safeTotal === 0 ? 0 : (safePage - 1) * currentSize + 1
  const end = safeTotal === 0 ? 0 : Math.min(safePage * currentSize, safeTotal)
  const hasPrev = safePage > 1
  const hasNext = safePage < pageCount

  return (
    <div className="app-panel flex flex-col gap-3 rounded-[1.3rem] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <p className="app-text-subtle text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
        <p className="app-text-muted text-sm">
          Showing <span className="app-text-strong font-semibold">{start}-{end}</span> of{' '}
          <span className="app-text-strong font-semibold">{safeTotal}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((size) => (
            <Link
              key={size}
              href={buildHref(pathname, query, { [sizeParam]: size, [pageParam]: 1 }, anchorId)}
              scroll={false}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                currentSize === size
                  ? 'border-emerald-300 bg-[var(--app-success-bg)] text-[var(--app-success-text)]'
                  : 'app-badge-neutral hover:bg-[var(--app-surface-soft)]'
              }`}
            >
              Top {size}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasPrev ? (
            <Link
              href={buildHref(pathname, query, { [pageParam]: safePage - 1 }, anchorId)}
              scroll={false}
              className="app-link-chip rounded-full px-3 py-2 text-xs font-semibold transition hover:bg-[var(--app-surface-soft)]"
            >
              Previous
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-full border app-border bg-[var(--app-surface-soft)] px-3 py-2 text-xs font-semibold app-text-subtle">
              Previous
            </span>
          )}
          <span className="app-text-subtle text-xs font-medium">
            Page {safePage} of {pageCount}
          </span>
          {hasNext ? (
            <Link
              href={buildHref(pathname, query, { [pageParam]: safePage + 1 }, anchorId)}
              scroll={false}
              className="app-link-chip rounded-full px-3 py-2 text-xs font-semibold transition hover:bg-[var(--app-surface-soft)]"
            >
              Next
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-full border app-border bg-[var(--app-surface-soft)] px-3 py-2 text-xs font-semibold app-text-subtle">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
