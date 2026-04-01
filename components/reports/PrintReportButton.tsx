'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintReportButton({
  href,
  autoPrint = false,
  label = 'Print / PDF',
}: {
  href?: string
  autoPrint?: boolean
  label?: string
}) {
  useEffect(() => {
    if (!autoPrint) return
    const timeout = window.setTimeout(() => {
      window.print()
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [autoPrint])

  if (autoPrint) {
    return (
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        {label}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        if (!href) return
        window.open(href, '_blank', 'noopener,noreferrer')
      }}
    >
      <Printer className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
