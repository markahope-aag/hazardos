'use client'

import { useMemo } from 'react'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { PHOTO_REQUIREMENTS } from '@/lib/stores/survey-types'
import { PhotoGallery } from '../photos'
import { Camera, CheckCircle2, AlertTriangle } from 'lucide-react'

export function PhotosSection() {
  const { formData } = useSurveyStore()
  const photos = formData.photos.photos

  const completionStatus = useMemo(() => {
    const totalItems = photos.length
    const exteriorCount = photos.filter(
      (p) => p.category === 'exterior' && p.mediaType !== 'video',
    ).length
    const exteriorRequired = PHOTO_REQUIREMENTS.exterior.required
    const exteriorComplete = exteriorCount >= exteriorRequired
    const videoCount = photos.filter((p) => p.mediaType === 'video').length

    return {
      totalItems,
      videoCount,
      exteriorCount,
      exteriorRequired,
      exteriorComplete,
      allRequired: exteriorComplete,
    }
  }, [photos])

  const photoCount = completionStatus.totalItems - completionStatus.videoCount

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="p-4 bg-muted rounded-xl">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="font-semibold">Photos &amp; Videos</h3>
            <p className="text-sm text-muted-foreground">
              {photoCount} photo{photoCount !== 1 ? 's' : ''}
              {completionStatus.videoCount > 0 && (
                <>
                  {' · '}
                  {completionStatus.videoCount} video
                  {completionStatus.videoCount !== 1 ? 's' : ''}
                </>
              )}
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

      {/* Capture Tips */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Capture Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Capture all 4 sides of the building exterior</li>
          <li>• Include close-ups of any hazardous materials</li>
          <li>• Document utility access points and shutoffs</li>
          <li>• Add captions to help identify locations later</li>
        </ul>

        <h4 className="font-semibold text-blue-800 mt-3 mb-2">Recording Video</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Tap a capture button below — your camera opens in photo mode</li>
          <li>• Swipe to <strong>Video</strong> mode (or tap the Video tab) before recording</li>
          <li>• Use video for walkthroughs and context a single photo can&apos;t show</li>
          <li>• You must be online to upload video — photos can wait until later</li>
          <li>• Keep clips under 250 MB; shoot at standard (not 4K) for shorter files</li>
        </ul>
      </div>

      {/* Gallery by Category */}
      <PhotoGallery />
    </div>
  )
}
