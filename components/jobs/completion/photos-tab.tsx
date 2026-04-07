'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import NextImage from 'next/image'
import { Camera, Trash2 } from 'lucide-react'
import type { PhotosTabProps, PhotoType } from './types'

const PHOTO_TYPES: { value: PhotoType; label: string }[] = [
  { value: 'before', label: 'Before' },
  { value: 'during', label: 'During' },
  { value: 'after', label: 'After' },
  { value: 'issue', label: 'Issue' },
  { value: 'documentation', label: 'Documentation' },
]

export function PhotosTab({
  data,
  onPhotoUpload,
  onDeletePhoto,
}: PhotosTabProps) {
  return (
    <div className="flex-1 px-4 py-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Capture Photos</CardTitle>
          <CardDescription>Take before, during, and after photos</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {PHOTO_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Camera className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">{type.label}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPhotoUpload(e, type.value)}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Photos grid */}
      <div className="space-y-2">
        <h3 className="font-medium">Photos ({data?.photos.length || 0})</h3>

        {data?.photos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No photos captured yet
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {data?.photos.map((photo) => (
            <div key={photo.id} className="relative group h-32">
              <NextImage
                src={photo.photo_url}
                alt={photo.caption || 'Job photo'}
                fill
                className="object-cover rounded-lg"
                unoptimized
              />
              <Badge className="absolute top-2 left-2 text-xs z-10">
                {photo.photo_type}
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => onDeletePhoto(photo.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
