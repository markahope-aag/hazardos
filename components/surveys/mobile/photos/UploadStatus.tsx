'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { processPhotoQueue, getUploadProgress } from '@/lib/services/photo-upload-service'
import {
  Cloud,
  CloudOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'

interface UploadStatusProps {
  surveyId: string | null
  className?: string
}

export function UploadStatus({ surveyId, className }: UploadStatusProps) {
  const isOnline = useOnlineStatus()
  const { retryFailed } = usePhotoQueueStore()
  const [status, setStatus] = useState({
    total: 0,
    uploaded: 0,
    pending: 0,
    failed: 0,
    progress: 100,
  })
  const [isRetrying, setIsRetrying] = useState(false)

  // Update status periodically
  useEffect(() => {
    if (!surveyId) return

    const updateStatus = () => {
      setStatus(getUploadProgress(surveyId))
    }

    // Update immediately
    updateStatus()

    // Update periodically
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [surveyId])

  // Don't show if no photos
  if (!surveyId || status.total === 0) {
    return null
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    retryFailed()
    await processPhotoQueue()
    setIsRetrying(false)
  }

  const handleUploadNow = async () => {
    await processPhotoQueue()
  }

  // Determine display state
  const isProcessing = status.pending > 0
  const hasFailures = status.failed > 0
  const isComplete = status.uploaded === status.total && !hasFailures

  return (
    <div
      className={cn(
        'flex items-center gap-3 text-sm p-3 rounded-lg',
        !isOnline
          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          : hasFailures
          ? 'bg-red-50 text-red-700 border border-red-200'
          : isProcessing
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : isComplete
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {/* Icon */}
      {!isOnline ? (
        <CloudOff className="h-5 w-5 flex-shrink-0" />
      ) : isProcessing ? (
        <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
      ) : hasFailures ? (
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
      ) : isComplete ? (
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <Cloud className="h-5 w-5 flex-shrink-0" />
      )}

      {/* Status Text */}
      <div className="flex-1 min-w-0">
        {!isOnline ? (
          <p>
            <span className="font-medium">{status.pending + status.failed} photos</span> waiting
            for connection
          </p>
        ) : isProcessing ? (
          <p>
            Uploading <span className="font-medium">{status.pending}</span> of{' '}
            <span className="font-medium">{status.pending + status.uploaded}</span>...
          </p>
        ) : hasFailures ? (
          <p>
            <span className="font-medium">{status.failed}</span> photo
            {status.failed !== 1 ? 's' : ''} failed to upload
          </p>
        ) : isComplete ? (
          <p>
            All <span className="font-medium">{status.uploaded}</span> photos uploaded
          </p>
        ) : (
          <p>
            <span className="font-medium">{status.uploaded}</span> uploaded,{' '}
            <span className="font-medium">{status.pending}</span> pending
          </p>
        )}
      </div>

      {/* Action Button */}
      {isOnline && hasFailures && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex-shrink-0 h-8 px-2 text-red-700 hover:text-red-800 hover:bg-red-100"
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </>
          )}
        </Button>
      )}

      {isOnline && !isProcessing && !hasFailures && status.pending > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUploadNow}
          className="flex-shrink-0 h-8 px-2 text-blue-700 hover:text-blue-800 hover:bg-blue-100"
        >
          <Cloud className="h-4 w-4 mr-1" />
          Upload
        </Button>
      )}
    </div>
  )
}

/**
 * Compact version for use in headers/footers
 */
export function UploadStatusCompact({ surveyId }: { surveyId: string | null }) {
  const isOnline = useOnlineStatus()
  const [status, setStatus] = useState({
    total: 0,
    uploaded: 0,
    pending: 0,
    failed: 0,
    progress: 100,
  })

  useEffect(() => {
    if (!surveyId) return

    const updateStatus = () => {
      setStatus(getUploadProgress(surveyId))
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [surveyId])

  if (!surveyId || status.total === 0) return null

  const isProcessing = status.pending > 0
  const hasFailures = status.failed > 0

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {!isOnline ? (
        <>
          <CloudOff className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-yellow-600">{status.pending + status.failed}</span>
        </>
      ) : isProcessing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
          <span className="text-blue-600">{status.pending}</span>
        </>
      ) : hasFailures ? (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-red-600">{status.failed}</span>
        </>
      ) : (
        <>
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-600">{status.uploaded}</span>
        </>
      )}
    </div>
  )
}
