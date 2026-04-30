'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { PhotoData, PhotoCategory, PHOTO_REQUIREMENTS } from '@/lib/stores/survey-types'
import { getSignedSurveyMediaUrl } from '@/lib/services/photo-upload-service'
import { Trash2, MapPin, Calendar, Loader2 } from 'lucide-react'

interface PhotoDetailProps {
  photo: PhotoData | null
  open: boolean
  onClose: () => void
}

export function PhotoDetail({ photo, open, onClose }: PhotoDetailProps) {
  const { updatePhoto, removePhoto } = useSurveyStore()
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setResolvedUrl(null)
      return
    }
    if (photo.dataUrl?.startsWith('data:')) {
      setResolvedUrl(photo.dataUrl)
      return
    }
    if (photo.path) {
      let cancelled = false
      getSignedSurveyMediaUrl(photo.path).then((url) => {
        if (!cancelled) setResolvedUrl(url)
      })
      return () => {
        cancelled = true
      }
    }
    setResolvedUrl(photo.dataUrl || null)
  }, [photo])

  if (!photo) return null

  const handleCategoryChange = (value: PhotoCategory) => {
    updatePhoto(photo.id, { category: value })
  }

  const handleLocationChange = (value: string) => {
    updatePhoto(photo.id, { location: value })
  }

  const handleCaptionChange = (value: string) => {
    updatePhoto(photo.id, { caption: value })
  }

  const isVideo = photo.mediaType === 'video'
  const mediaLabel = isVideo ? 'video' : 'photo'

  const handleDelete = () => {
    if (confirm(`Delete this ${mediaLabel}?`)) {
      removePhoto(photo.id)
      onClose()
    }
  }

  const formattedDate = new Date(photo.timestamp).toLocaleString()

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isVideo ? 'Video Details' : 'Photo Details'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Preview */}
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            {resolvedUrl ? (
              isVideo ? (
                <video
                  src={resolvedUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedUrl}
                  alt={photo.caption || 'Survey photo'}
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </div>
            {photo.gpsCoordinates && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {photo.gpsCoordinates.latitude.toFixed(6)}, {photo.gpsCoordinates.longitude.toFixed(6)}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={photo.category}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="min-h-[48px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PHOTO_REQUIREMENTS) as [PhotoCategory, { label: string; required: number }][]).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={photo.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="e.g., Front entrance, Kitchen ceiling"
              className="min-h-[48px]"
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label>Caption</Label>
            <Input
              value={photo.caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              placeholder="Brief description of what's shown"
              className="min-h-[48px]"
            />
          </div>

          {/* Delete Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="w-full min-h-[48px] text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {isVideo ? 'Video' : 'Photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
