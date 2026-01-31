'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { processPhotoQueue } from '@/lib/services/photo-upload-service'
import { PhotoCategory } from '@/lib/stores/survey-types'
import { Camera, Loader2 } from 'lucide-react'

interface PhotoCaptureProps {
  category: PhotoCategory
  onCapture?: () => void
}

export function PhotoCapture({ category, onCapture }: PhotoCaptureProps) {
  const { addPhoto, currentSurveyId } = useSurveyStore()
  const { addPhoto: addToQueue } = usePhotoQueueStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)

    try {
      // Convert to data URL for local storage/preview
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Get GPS coordinates if available
      let gpsCoordinates: { latitude: number; longitude: number } | null = null
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 60000,
            })
          })
          gpsCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        } catch {
          // GPS not available, continue without
        }
      }

      const timestamp = new Date().toISOString()

      // Add to survey store for immediate UI display
      const photoId = addPhoto({
        blob: file,
        dataUrl,
        timestamp,
        gpsCoordinates,
        category,
        location: '',
        caption: '',
      })

      // If we have a survey ID, also add to upload queue
      if (currentSurveyId) {
        addToQueue({
          surveyId: currentSurveyId,
          localUri: dataUrl,
          category,
          location: '',
          caption: '',
          gpsCoordinates,
          fileSize: file.size,
          fileType: file.type,
        })

        // Trigger queue processing if online
        if (navigator.onLine) {
          // Process queue in background
          setTimeout(() => processPhotoQueue(), 100)
        }
      }

      onCapture?.()
    } catch (error) {
      console.error('Error processing photo:', error)
    } finally {
      setIsProcessing(false)
      // Reset input to allow capturing same file again
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Capture photo"
      />
      <Button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        className="w-full min-h-[64px] text-lg touch-manipulation"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Camera className="w-6 h-6 mr-3" />
            Take Photo
          </>
        )}
      </Button>
    </>
  )
}
