'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GeneratePdfButtonProps {
  href: string
  label?: string
}

export function GeneratePdfButton({
  href,
  label = 'Generate PDF',
}: GeneratePdfButtonProps) {
  const [loading, setLoading] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      loading={loading}
      onClick={() => {
        setLoading(true)
        const popup = window.open(href, '_blank', 'noopener,noreferrer')
        popup?.focus()
        window.setTimeout(() => setLoading(false), 1200)
      }}
    >
      {!loading && <FileDown className="mr-2 h-4 w-4" />}
      {loading ? 'Preparing PDF...' : label}
    </Button>
  )
}

export { GeneratePdfButton as PrintReportButton }
