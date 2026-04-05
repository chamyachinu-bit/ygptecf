'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationLoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)

  // Navigation completed — finish the bar
  useEffect(() => {
    if (!doneRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(100)
    setOverlay(false)
    const t = setTimeout(() => {
      setVisible(false)
      setProgress(0)
      doneRef.current = false
    }, 350)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()])

  useEffect(() => {
    function onFormSubmit() {
      doneRef.current = true
      setVisible(true)
      setOverlay(true)
      setProgress(15)
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          const next = p + Math.random() * 12
          return next > 88 ? 88 : next
        })
      }, 600)
    }

    window.addEventListener('submit', onFormSubmit)
    return () => {
      window.removeEventListener('submit', onFormSubmit)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <>
      {/* Thin progress bar */}
      {visible && (
        <div className="pointer-events-none fixed left-0 top-0 z-[200] h-[3px] w-full">
          <div
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.7)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Save overlay */}
      {overlay && (
        <div className="pointer-events-none fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-[3px]">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100/30" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-emerald-400 border-r-emerald-500" />
          </div>
          <p className="rounded-full border border-white/15 bg-black/40 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
            Saving…
          </p>
        </div>
      )}
    </>
  )
}
