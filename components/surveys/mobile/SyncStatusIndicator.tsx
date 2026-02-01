'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useOfflineSync, SyncStatus } from '@/lib/hooks/use-offline-sync'
import { Button } from '@/components/ui/button'
import {
  Cloud,
  CloudOff,
  Loader2,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  ChevronDown,
} from 'lucide-react'

interface SyncStatusIndicatorProps {
  variant?: 'compact' | 'full' | 'badge'
  className?: string
  showDetails?: boolean
}

/**
 * Status icon based on sync status
 */
function StatusIcon({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'synced':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />
    case 'syncing':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
    case 'pending':
      return <Cloud className="w-4 h-4 text-yellow-600" />
    case 'offline':
      return <WifiOff className="w-4 h-4 text-gray-500" />
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600" />
  }
}

/**
 * Status label based on sync status
 */
function getStatusLabel(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'All changes saved'
    case 'syncing':
      return 'Syncing...'
    case 'pending':
      return 'Changes pending'
    case 'offline':
      return 'Offline mode'
    case 'error':
      return 'Sync error'
  }
}

/**
 * Sync Status Indicator Component
 *
 * Displays current sync status and allows manual sync operations.
 * Available in three variants:
 * - compact: Just an icon
 * - badge: Icon with short label
 * - full: Expandable panel with details
 */
export function SyncStatusIndicator({
  variant = 'badge',
  className,
  showDetails = false,
}: SyncStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)

  const {
    status,
    isOnline,
    pendingSurveys,
    pendingPhotos,
    failedPhotos,
    storagePercentUsed,
    lastSyncAt,
    lastSyncError,
    syncNow,
    retryFailed,
  } = useOfflineSync()

  const hasPending = pendingSurveys > 0 || pendingPhotos > 0
  const hasErrors = failedPhotos > 0 || lastSyncError !== null

  // Format last sync time
  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Compact variant - just icon
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center', className)}>
        <StatusIcon status={status} />
      </div>
    )
  }

  // Badge variant - icon with label
  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
          status === 'synced' && 'bg-green-100 text-green-700',
          status === 'syncing' && 'bg-blue-100 text-blue-700',
          status === 'pending' && 'bg-yellow-100 text-yellow-700',
          status === 'offline' && 'bg-gray-100 text-gray-600',
          status === 'error' && 'bg-red-100 text-red-700',
          className
        )}
      >
        <StatusIcon status={status} />
        <span className="hidden sm:inline">{getStatusLabel(status)}</span>
      </div>
    )
  }

  // Full variant - expandable panel
  return (
    <div className={cn('relative', className)}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors',
          'touch-manipulation min-h-[44px]',
          status === 'synced' && 'border-green-200 bg-green-50',
          status === 'syncing' && 'border-blue-200 bg-blue-50',
          status === 'pending' && 'border-yellow-200 bg-yellow-50',
          status === 'offline' && 'border-gray-200 bg-gray-50',
          status === 'error' && 'border-red-200 bg-red-50'
        )}
      >
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{getStatusLabel(status)}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 ml-1 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-background rounded-xl border-2 border-border shadow-lg z-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Sync Status</h4>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-md hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status details */}
          <div className="space-y-3 text-sm">
            {/* Connection status */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connection</span>
              <span
                className={cn(
                  'flex items-center gap-1',
                  isOnline ? 'text-green-600' : 'text-gray-500'
                )}
              >
                {isOnline ? (
                  <>
                    <Cloud className="w-4 h-4" />
                    Online
                  </>
                ) : (
                  <>
                    <CloudOff className="w-4 h-4" />
                    Offline
                  </>
                )}
              </span>
            </div>

            {/* Last sync */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last sync</span>
              <span>{formatLastSync(lastSyncAt)}</span>
            </div>

            {/* Pending items */}
            {hasPending && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className="text-yellow-600">
                  {pendingSurveys > 0 && `${pendingSurveys} survey(s)`}
                  {pendingSurveys > 0 && pendingPhotos > 0 && ', '}
                  {pendingPhotos > 0 && `${pendingPhotos} photo(s)`}
                </span>
              </div>
            )}

            {/* Failed items */}
            {failedPhotos > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Failed uploads</span>
                <span className="text-red-600">{failedPhotos} photo(s)</span>
              </div>
            )}

            {/* Storage usage */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Storage used</span>
              <span>{storagePercentUsed}%</span>
            </div>

            {/* Error message */}
            {lastSyncError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                {lastSyncError}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {/* Sync now button */}
            <Button
              size="sm"
              onClick={syncNow}
              disabled={!isOnline || status === 'syncing'}
              className="w-full"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 mr-2',
                  status === 'syncing' && 'animate-spin'
                )}
              />
              {status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Button>

            {/* Retry failed button */}
            {hasErrors && (
              <Button
                size="sm"
                variant="outline"
                onClick={retryFailed}
                disabled={!isOnline}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Failed Uploads
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline sync status for headers
 */
export function InlineSyncStatus({ className }: { className?: string }) {
  const { status, isOnline, pendingPhotos, failedPhotos, syncNow } =
    useOfflineSync()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs">
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </div>
      )}

      {/* Syncing indicator */}
      {status === 'syncing' && (
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      )}

      {/* Pending indicator */}
      {status === 'pending' && pendingPhotos > 0 && (
        <span className="text-xs text-yellow-600">
          {pendingPhotos} pending
        </span>
      )}

      {/* Error indicator */}
      {failedPhotos > 0 && (
        <button
          type="button"
          onClick={() => syncNow()}
          className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs hover:bg-red-200"
        >
          <AlertCircle className="w-3 h-3" />
          <span>{failedPhotos} failed</span>
        </button>
      )}

      {/* Synced indicator */}
      {status === 'synced' && isOnline && (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          Saved
        </span>
      )}
    </div>
  )
}
