'use client'

import { useEffect, useState } from 'react'

export function SaveToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 2600)
    const cleanup = window.setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('saved')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }, 3100)

    return () => {
      window.clearTimeout(timeout)
      window.clearTimeout(cleanup)
    }
  }, [])

  return (
    <div
      className={`fixed right-5 top-5 z-[80] transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div className="app-panel flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--app-success-bg)', color: 'var(--app-success-text)' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415.005L3.29 9.204a1 1 0 111.42-1.408l4.09 4.12 6.492-6.625a1 1 0 011.412-.001z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <p className="app-text-strong text-sm font-semibold">{message}</p>
          <p className="app-text-muted text-xs">Your latest admin change has been saved.</p>
        </div>
      </div>
    </div>
  )
}
