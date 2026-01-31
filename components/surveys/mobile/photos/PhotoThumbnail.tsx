'use client'

import { cn } from '@/lib/utils'
import { PhotoData } from '@/lib/stores/survey-types'
import { MapPin } from 'lucide-react'

interface PhotoThumbnailProps {
  photo: PhotoData
  onClick: () => void
}

export function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary focus:border-primary transition-colors touch-manipulation"
    >
      {photo.dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.dataUrl}
          alt={photo.caption || 'Survey photo'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
          No image
        </div>
      )}

      {/* GPS indicator */}
      {photo.gpsCoordinates && (
        <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
          <MapPin className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Caption indicator */}
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
          {photo.caption}
        </div>
      )}
    </button>
  )
}
