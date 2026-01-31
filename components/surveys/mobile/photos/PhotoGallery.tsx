'use client'

import { useState, useMemo } from 'react'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { PhotoData, PhotoCategory, PHOTO_REQUIREMENTS } from '@/lib/stores/survey-types'
import { PhotoCategoryGroup } from './PhotoCategoryGroup'
import { PhotoDetail } from './PhotoDetail'

export function PhotoGallery() {
  const { formData } = useSurveyStore()
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null)

  // Group photos by category
  const photosByCategory = useMemo(() => {
    const grouped: Record<PhotoCategory, PhotoData[]> = {
      exterior: [],
      interior: [],
      asbestos_materials: [],
      mold_areas: [],
      lead_components: [],
      utility_access: [],
      other: [],
    }

    formData.photos.photos.forEach((photo: PhotoData) => {
      grouped[photo.category].push(photo)
    })

    return grouped
  }, [formData.photos.photos])

  const handlePhotoClick = (photo: PhotoData) => {
    setSelectedPhoto(photo)
  }

  const handleCloseDetail = () => {
    setSelectedPhoto(null)
  }

  // Order categories by importance (required first)
  const orderedCategories: PhotoCategory[] = [
    'exterior',
    'interior',
    'asbestos_materials',
    'mold_areas',
    'lead_components',
    'utility_access',
    'other',
  ]

  return (
    <>
      <div className="space-y-4">
        {orderedCategories.map((category) => (
          <PhotoCategoryGroup
            key={category}
            category={category}
            photos={photosByCategory[category]}
            onPhotoClick={handlePhotoClick}
          />
        ))}
      </div>

      <PhotoDetail
        photo={selectedPhoto}
        open={selectedPhoto !== null}
        onClose={handleCloseDetail}
      />
    </>
  )
}
