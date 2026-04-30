'use client'

import { useEffect, useState } from 'react'
import { PhotoData } from '@/lib/stores/survey-types'
import { getSignedSurveyMediaUrl } from '@/lib/services/photo-upload-service'
import { MapPin, Play } from 'lucide-react'

interface PhotoThumbnailProps {
  photo: PhotoData
  onClick: () => void
}

/**
 * Resolve a render URL for the thumbnail. Inline data: URLs render
 * directly. Storage-backed items (path is set, dataUrl is empty or
 * stale) get a fresh signed URL.
 */
function useResolvedMediaUrl(photo: PhotoData): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    photo.dataUrl?.startsWith('data:') ? photo.dataUrl : photo.dataUrl || null,
  )

  useEffect(() => {
    if (photo.dataUrl?.startsWith('data:')) {
      setResolved(photo.dataUrl)
      return
    }
    if (photo.path) {
      let cancelled = false
      getSignedSurveyMediaUrl(photo.path).then((url) => {
        if (!cancelled) setResolved(url)
      })
      return () => {
        cancelled = true
      }
    }
    // No path and no data URL — fall back to whatever is in dataUrl.
    setResolved(photo.dataUrl || null)
  }, [photo.dataUrl, photo.path])

  return resolved
}

export function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  const isVideo = photo.mediaType === 'video'
  const url = useResolvedMediaUrl(photo)

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary focus:border-primary transition-colors touch-manipulation"
    >
      {url ? (
        isVideo ? (
          <video
            src={url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={photo.caption || 'Survey photo'}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
          Loading…
        </div>
      )}

      {isVideo && url && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 rounded-full p-2">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>
      )}

      {photo.gpsCoordinates && (
        <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
          <MapPin className="w-3 h-3 text-white" />
        </div>
      )}

      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
          {photo.caption}
        </div>
      )}
    </button>
  )
}
