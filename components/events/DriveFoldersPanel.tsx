'use client'

import { RefreshCw, ExternalLink, FolderOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type DriveFolderItem = {
  key: string
  label: string
  description: string
  url?: string | null
}

interface DriveFoldersPanelProps {
  eventId: string
  title: string
  description?: string
  folders: DriveFolderItem[]
  syncStatus?: string | null
  syncMessage?: string | null
  canRefresh?: boolean
}

export function DriveFoldersPanel({
  eventId,
  title,
  description,
  folders,
  syncStatus,
  syncMessage,
  canRefresh = false,
}: DriveFoldersPanelProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const response = await fetch('/api/events/drive-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const payload = await response.json()
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || payload.message || 'Drive refresh failed')
      }
      router.refresh()
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Drive refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="app-text-muted mt-2 text-sm">{description}</p>}
        </div>
        {canRefresh && (
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} loading={refreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Links
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {(syncStatus || syncMessage) && (
          <div className={`rounded-md border p-3 text-sm ${
            syncStatus === 'ready'
              ? 'app-success-soft'
              : syncStatus === 'error'
                ? 'app-danger-soft'
                : 'app-warning-soft'
          }`}>
            <p className="font-medium capitalize">{syncStatus ?? 'Drive status'}</p>
            {syncMessage && <p className="mt-1">{syncMessage}</p>}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {folders.map((folder) => (
            <div key={folder.key} className="app-panel-soft rounded-xl p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="app-success-soft rounded-lg p-2">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="app-text-strong font-medium">{folder.label}</p>
                  <p className="app-text-muted text-sm">{folder.description}</p>
                </div>
              </div>
              {folder.url ? (
                <a
                  href={folder.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Folder
                </a>
              ) : (
                <p className="app-text-muted text-sm">Drive routing not configured yet.</p>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="app-danger-soft rounded-md p-3 text-sm">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
