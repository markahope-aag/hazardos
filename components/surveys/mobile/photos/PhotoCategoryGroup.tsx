'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PhotoData, PhotoCategory, PHOTO_REQUIREMENTS } from '@/lib/stores/survey-types'
import { PhotoThumbnail } from './PhotoThumbnail'
import { PhotoCapture } from './PhotoCapture'
import { ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface PhotoCategoryGroupProps {
  category: PhotoCategory
  photos: PhotoData[]
  onPhotoClick: (photo: PhotoData) => void
}

export function PhotoCategoryGroup({ category, photos, onPhotoClick }: PhotoCategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(true)
  const requirement = PHOTO_REQUIREMENTS[category]
  const count = photos.length
  const isComplete = count >= requirement.required
  const needsMore = requirement.required > 0 && count < requirement.required

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-2 rounded-xl overflow-hidden bg-background">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full p-4 text-left touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg">{requirement.label}</span>
              <span
                className={cn(
                  'text-sm px-2 py-0.5 rounded-full',
                  isComplete
                    ? 'bg-green-100 text-green-700'
                    : needsMore
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
                {requirement.required > 0 && ` / ${requirement.required}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {requirement.required > 0 && (
                isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )
              )}
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border/50">
            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-4">
                {photos.map((photo) => (
                  <PhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    onClick={() => onPhotoClick(photo)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {photos.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No photos in this category</p>
              </div>
            )}

            {/* Capture Button */}
            <PhotoCapture category={category} />

            {/* Requirement Warning */}
            {needsMore && (
              <p className="text-sm text-yellow-600 text-center">
                {requirement.required - count} more photo{requirement.required - count !== 1 ? 's' : ''} required
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
