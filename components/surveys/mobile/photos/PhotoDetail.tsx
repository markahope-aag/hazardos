'use client'

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
import { Trash2, MapPin, Calendar } from 'lucide-react'

interface PhotoDetailProps {
  photo: PhotoData | null
  open: boolean
  onClose: () => void
}

export function PhotoDetail({ photo, open, onClose }: PhotoDetailProps) {
  const { updatePhoto, removePhoto } = useSurveyStore()

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

  const handleDelete = () => {
    if (confirm('Delete this photo?')) {
      removePhoto(photo.id)
      onClose()
    }
  }

  const formattedDate = new Date(photo.timestamp).toLocaleString()

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Photo Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Preview */}
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            {photo.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.dataUrl}
                alt={photo.caption || 'Survey photo'}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No image available
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
            Delete Photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
