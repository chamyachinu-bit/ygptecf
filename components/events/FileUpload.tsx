'use client'
import { useState, useCallback } from 'react'
import { Upload, File, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/utils/formatters'

interface FileUploadProps {
  eventId: string
  userId: string
  fileType: string
  onUploaded?: () => void
}

export function FileUpload({ eventId, userId, fileType, onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File must be under 10MB')
        setUploading(false)
        return
      }

      const storagePath = `${userId}/${eventId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('event-files')
        .upload(storagePath, file)

      if (uploadError) {
        setError(uploadError.message)
        setUploading(false)
        return
      }

      await supabase.from('files').insert({
        event_id: eventId,
        uploaded_by: userId,
        file_name: file.name,
        file_type: fileType,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
      })
    }

    setUploading(false)
    onUploaded?.()
    e.target.value = ''
  }, [eventId, userId, fileType, onUploaded])

  return (
    <div>
      <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
        <Upload className="w-8 h-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Uploading...' : 'Click to upload files'}
          </p>
          <p className="text-xs text-gray-500">PDF, Images, Documents up to 10MB</p>
        </div>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
        />
      </label>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
