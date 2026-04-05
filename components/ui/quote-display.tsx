'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_QUOTES, type Quote } from '@/lib/quotes'

interface QuoteDisplayProps {
  initialQuotes?: Quote[]
  intervalMs?: number
  className?: string
  variant?: 'dark' | 'light'
}

export function QuoteDisplay({
  initialQuotes,
  intervalMs = 6000,
  className = '',
  variant = 'dark',
}: QuoteDisplayProps) {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes ?? DEFAULT_QUOTES)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!initialQuotes) {
      fetch('/api/quotes')
        .then((r) => r.json())
        .then((data: Quote[]) => {
          if (data?.length) setQuotes(data)
        })
        .catch(() => {})
    }
  }, [initialQuotes])

  useEffect(() => {
    if (quotes.length <= 1) return
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % quotes.length)
        setVisible(true)
      }, 400)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [quotes.length, intervalMs])

  const quote = quotes[index]
  if (!quote) return null

  const textClass = variant === 'dark' ? 'text-white/90' : 'text-slate-700'
  const authorClass = variant === 'dark' ? 'text-white/55' : 'text-slate-500'
  const barClass = variant === 'dark' ? 'bg-emerald-400/60' : 'bg-emerald-500'

  return (
    <div
      className={`transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'} ${className}`}
    >
      <div className={`flex gap-3`}>
        <div className={`mt-1 w-0.5 shrink-0 rounded-full ${barClass}`} />
        <div className="space-y-1.5">
          <p className={`text-sm leading-7 font-medium ${textClass}`}>&ldquo;{quote.text}&rdquo;</p>
          {quote.author && (
            <p className={`text-xs font-semibold uppercase tracking-[0.15em] ${authorClass}`}>
              — {quote.author}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
