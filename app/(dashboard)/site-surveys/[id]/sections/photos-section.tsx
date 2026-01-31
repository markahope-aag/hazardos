'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Camera, MapPin, Calendar } from 'lucide-react'
import type { SurveyPhotoMetadata } from '@/types/database'

interface PhotosSectionProps {
  photos: SurveyPhotoMetadata[] | null
}

const categoryLabels: Record<string, string> = {
  overview: 'Overview',
  exterior: 'Exterior',
  interior: 'Interior',
  hazard_area: 'Hazard Area',
  damage: 'Damage',
  access: 'Access Points',
  equipment: 'Equipment',
  before: 'Before',
  after: 'After',
  other: 'Other',
}

export function PhotosSection({ photos }: PhotosSectionProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<SurveyPhotoMetadata | null>(null)

  if (!photos || photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No photos attached to this survey.
        </CardContent>
      </Card>
    )
  }

  // Group by category
  const grouped = photos.reduce((acc, photo) => {
    const cat = photo.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(photo)
    return acc
  }, {} as Record<string, SurveyPhotoMetadata[]>)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Survey Photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, categoryPhotos]) => (
              <div key={category}>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  {categoryLabels[category] || category}
                  <Badge variant="secondary" className="text-xs">
                    {categoryPhotos.length}
                  </Badge>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categoryPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square cursor-pointer group rounded-lg overflow-hidden bg-muted"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption || `Photo ${photo.id}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">View</span>
                      </div>
                      {photo.gpsCoordinates && (
                        <div className="absolute bottom-1 right-1 p-1 bg-black/50 rounded">
                          <MapPin className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Photo Details</DialogTitle>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || 'Survey photo'}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2">
                {selectedPhoto.caption && (
                  <p className="text-center font-medium">{selectedPhoto.caption}</p>
                )}

                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <Badge variant="outline">{categoryLabels[selectedPhoto.category] || selectedPhoto.category}</Badge>

                  {selectedPhoto.location && (
                    <span>{selectedPhoto.location}</span>
                  )}

                  {selectedPhoto.timestamp && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(selectedPhoto.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>

                {selectedPhoto.gpsCoordinates && (
                  <p className="text-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {selectedPhoto.gpsCoordinates.latitude.toFixed(6)},{' '}
                    {selectedPhoto.gpsCoordinates.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
