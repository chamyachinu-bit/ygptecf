'use client'
import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/events/FileUpload'
import { formatFileSize } from '@/lib/utils/formatters'
import type { EventFile } from '@/types/database'

interface EventFilesPanelProps {
  files: EventFile[]
  eventId: string
  userId: string
  canUpload?: boolean
  uploadLabel?: string
  fileType?: string
}

export function EventFilesPanel({
  files,
  eventId,
  userId,
  canUpload,
  uploadLabel = 'Supporting Files',
  fileType = 'proposal_attachment',
}: EventFilesPanelProps) {
  const router = useRouter()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (file: EventFile) => {
    setDownloadingId(file.id)
    try {
      const response = await fetch('/api/files/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.storage_path }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to fetch file')
      }
      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch {
      // Refresh so any expired sessions or policies are reflected in the UI.
      router.refresh()
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{uploadLabel}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {canUpload && (
          <FileUpload
            eventId={eventId}
            userId={userId}
            fileType={fileType}
            onUploaded={() => router.refresh()}
          />
        )}

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 rounded-md border border-gray-200">
                <FileText className="w-4 h-4 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {file.file_type} {file.file_size ? `· ${formatFileSize(file.file_size)}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  loading={downloadingId === file.id}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No files uploaded yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
