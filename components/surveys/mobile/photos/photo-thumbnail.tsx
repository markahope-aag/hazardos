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
 * directly. Storage-backed items prefer the stamped JPEG derivative
 * (with burned-in timestamp/job/GPS) and fall back to the original
 * path while the stamp pipeline catches up — or permanently for
 * videos and pre-pipeline rows.
 */
function useResolvedMediaUrl(photo: PhotoData): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    photo.dataUrl?.startsWith('data:') ? photo.dataUrl : photo.dataUrl || null,
  )

  const renderPath = photo.stamped_path ?? photo.path

  useEffect(() => {
    if (photo.dataUrl?.startsWith('data:')) {
      setResolved(photo.dataUrl)
      return
    }
    if (renderPath) {
      let cancelled = false
      getSignedSurveyMediaUrl(renderPath).then((url) => {
        if (!cancelled) setResolved(url)
      })
      return () => {
        cancelled = true
      }
    }
    setResolved(photo.dataUrl || null)
  }, [photo.dataUrl, renderPath])

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

      {!isVideo && photo.path && photo.stamp_status !== 'stamped' && (
        <div className="absolute top-1 left-1 bg-amber-500/90 text-[10px] font-semibold text-black rounded px-1.5 py-0.5 uppercase tracking-wide">
          Unstamped
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
