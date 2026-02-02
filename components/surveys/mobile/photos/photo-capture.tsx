'use client'

import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { processPhotoQueue } from '@/lib/services/photo-upload-service'
import { PhotoCategory } from '@/lib/stores/survey-types'
import { Camera, Loader2, ImagePlus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// Image compression settings
const MAX_IMAGE_WIDTH = 1920
const MAX_IMAGE_HEIGHT = 1920
const JPEG_QUALITY = 0.8
const MAX_FILE_SIZE_MB = 2

interface PhotoCaptureProps {
  category: PhotoCategory
  onCapture?: () => void
  variant?: 'default' | 'compact' | 'inline'
  className?: string
}

/**
 * Compress an image file to reduce size for upload
 * Uses canvas to resize and re-encode as JPEG
 */
async function compressImage(file: File): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img

      if (width > MAX_IMAGE_WIDTH) {
        height = (height * MAX_IMAGE_WIDTH) / width
        width = MAX_IMAGE_WIDTH
      }

      if (height > MAX_IMAGE_HEIGHT) {
        width = (width * MAX_IMAGE_HEIGHT) / height
        height = MAX_IMAGE_HEIGHT
      }

      // Set canvas size
      canvas.width = width
      canvas.height = height

      // Draw image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }

          // If still too large, reduce quality further
          if (blob.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            canvas.toBlob(
              (reducedBlob) => {
                if (!reducedBlob) {
                  reject(new Error('Failed to compress image'))
                  return
                }

                const reader = new FileReader()
                reader.onloadend = () => {
                  resolve({
                    dataUrl: reader.result as string,
                    blob: reducedBlob,
                  })
                }
                reader.onerror = reject
                reader.readAsDataURL(reducedBlob)
              },
              'image/jpeg',
              0.6 // Reduced quality
            )
          } else {
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve({
                dataUrl: reader.result as string,
                blob,
              })
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    // Load image from file
    const reader = new FileReader()
    reader.onload = () => {
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Get GPS coordinates with timeout
 */
async function getGPSCoordinates(
  timeoutMs: number = 5000
): Promise<{ latitude: number; longitude: number } | null> {
  if (!('geolocation' in navigator)) {
    return null
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('GPS timeout'))
      }, timeoutMs)

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutId)
          resolve(pos)
        },
        (err) => {
          clearTimeout(timeoutId)
          reject(err)
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 60000, // Accept cached position up to 1 minute old
        }
      )
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
  } catch {
    // GPS not available or timed out
    return null
  }
}

export function PhotoCapture({
  category,
  onCapture,
  variant = 'default',
  className,
}: PhotoCaptureProps) {
  const { addPhoto, currentSurveyId } = useSurveyStore()
  const { addPhoto: addToQueue } = usePhotoQueueStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(() => {
    setError(null)
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsProcessing(true)
      setError(null)

      try {
        // Start GPS request in parallel with image processing
        const gpsPromise = getGPSCoordinates()

        // Compress image
        const { dataUrl, blob } = await compressImage(file)

        // Wait for GPS (with timeout already built in)
        const gpsCoordinates = await gpsPromise

        const timestamp = new Date().toISOString()

        // Add to survey store for immediate UI display
        const photoId = addPhoto({
          blob,
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
            fileSize: blob.size,
            fileType: 'image/jpeg',
          })

          // Trigger queue processing if online
          if (navigator.onLine) {
            // Process queue in background
            setTimeout(() => processPhotoQueue(), 100)
          }
        }

        onCapture?.()

        // Log success
        console.log('Photo captured:', {
          id: photoId,
          category,
          size: `${(blob.size / 1024).toFixed(1)}KB`,
          hasGPS: !!gpsCoordinates,
        })
      } catch (err) {
        console.error('Error processing photo:', err)
        setError(err instanceof Error ? err.message : 'Failed to process photo')
      } finally {
        setIsProcessing(false)
        // Reset input to allow capturing same file again
        if (inputRef.current) {
          inputRef.current.value = ''
        }
      }
    },
    [addPhoto, addToQueue, category, currentSurveyId, onCapture]
  )

  // Render based on variant
  if (variant === 'compact') {
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
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isProcessing}
          className={cn('touch-manipulation min-h-[44px]', className)}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>
      </>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn('space-y-2', className)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Capture photo"
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={isProcessing}
          className={cn(
            'flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed',
            'rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50',
            'transition-colors touch-manipulation min-h-[80px]',
            isProcessing && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-6 h-6" />
              <span>Add Photo</span>
            </>
          )}
        </button>
        {error && (
          <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={handleClick}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn('space-y-2', className)}>
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
      {error && (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-1 px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
