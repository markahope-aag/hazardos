'use client'

import { useMemo } from 'react'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { PHOTO_REQUIREMENTS } from '@/lib/stores/survey-types'
import { PhotoGallery } from '../photos'
import { Camera, CheckCircle2, AlertTriangle } from 'lucide-react'

export function PhotosSection() {
  const { formData } = useSurveyStore()
  const photos = formData.photos.photos

  // Calculate completion status
  const completionStatus = useMemo(() => {
    const totalPhotos = photos.length
    const exteriorCount = photos.filter((p: { category: string }) => p.category === 'exterior').length
    const exteriorRequired = PHOTO_REQUIREMENTS.exterior.required
    const exteriorComplete = exteriorCount >= exteriorRequired

    return {
      totalPhotos,
      exteriorCount,
      exteriorRequired,
      exteriorComplete,
      allRequired: exteriorComplete,
    }
  }, [photos])

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="p-4 bg-muted rounded-xl">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="font-semibold">Photo Documentation</h3>
            <p className="text-sm text-muted-foreground">
              {completionStatus.totalPhotos} photo{completionStatus.totalPhotos !== 1 ? 's' : ''} captured
            </p>
          </div>
          {completionStatus.allRequired ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          )}
        </div>

        {/* Requirements Summary */}
        {!completionStatus.exteriorComplete && (
          <div className="mt-3 p-3 bg-yellow-100 rounded-lg text-sm text-yellow-700">
            <p>
              <strong>{completionStatus.exteriorRequired - completionStatus.exteriorCount}</strong> more exterior photo{completionStatus.exteriorRequired - completionStatus.exteriorCount !== 1 ? 's' : ''} required
              ({completionStatus.exteriorCount}/{completionStatus.exteriorRequired})
            </p>
          </div>
        )}
      </div>

      {/* Photo Tips */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Photo Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Capture all 4 sides of the building exterior</li>
          <li>• Include close-ups of any hazardous materials</li>
          <li>• Document utility access points and shutoffs</li>
          <li>• Add captions to help identify locations later</li>
        </ul>
      </div>

      {/* Photo Gallery by Category */}
      <PhotoGallery />
    </div>
  )
}
