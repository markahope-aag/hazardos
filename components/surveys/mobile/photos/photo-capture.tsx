'use client'

import { useRef, useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import exifr from 'exifr'
import { Button } from '@/components/ui/button'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import {
  processPhotoQueue,
  uploadSurveyMediaBlob,
} from '@/lib/services/photo-upload-service'
import { PhotoCategory } from '@/lib/stores/survey-types'
import { Camera, Loader2, ImagePlus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger, formatError } from '@/lib/utils/logger'

const MAX_IMAGE_WIDTH = 1920
const MAX_IMAGE_HEIGHT = 1920
const JPEG_QUALITY = 0.8
const MAX_FILE_SIZE_MB = 2
// Mirrors the storage bucket cap. Anything above this would be rejected
// by Supabase anyway — refusing client-side gives a clearer message.
const MAX_VIDEO_SIZE_MB = 250

interface PhotoCaptureProps {
  category: PhotoCategory
  onCapture?: () => void
  variant?: 'default' | 'compact' | 'inline'
  className?: string
}

interface ExtractedClientExif {
  exifCapturedAt: string | null
  clientCapturedAt: string
  exifGps: { lat: number; lng: number } | null
  deviceMake: string | null
  deviceModel: string | null
}

/**
 * Pull EXIF from the original camera file BEFORE compression. The
 * canvas compress step that follows strips all EXIF tags, so this is
 * our only chance to capture DateTimeOriginal, the camera-written GPS,
 * and the device make/model for the forensic stamp pipeline. Failures
 * are silent — screenshots, downloaded images, and devices that strip
 * EXIF still upload, just without the legal-grade timestamp.
 */
async function extractClientExif(file: File): Promise<ExtractedClientExif> {
  const clientCapturedAt = new Date().toISOString()
  try {
    const exif = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'latitude', 'longitude'],
    })
    if (!exif) {
      return {
        exifCapturedAt: null,
        clientCapturedAt,
        exifGps: null,
        deviceMake: null,
        deviceModel: null,
      }
    }
    const captured: Date | undefined = exif.DateTimeOriginal || exif.CreateDate
    const exifCapturedAt = captured instanceof Date ? captured.toISOString() : null
    const exifGps =
      typeof exif.latitude === 'number' && typeof exif.longitude === 'number'
        ? { lat: exif.latitude, lng: exif.longitude }
        : null
    return {
      exifCapturedAt,
      clientCapturedAt,
      exifGps,
      deviceMake: typeof exif.Make === 'string' ? exif.Make : null,
      deviceModel: typeof exif.Model === 'string' ? exif.Model : null,
    }
  } catch {
    return {
      exifCapturedAt: null,
      clientCapturedAt,
      exifGps: null,
      deviceMake: null,
      deviceModel: null,
    }
  }
}

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
      let { width, height } = img

      if (width > MAX_IMAGE_WIDTH) {
        height = (height * MAX_IMAGE_WIDTH) / width
        width = MAX_IMAGE_WIDTH
      }

      if (height > MAX_IMAGE_HEIGHT) {
        width = (width * MAX_IMAGE_HEIGHT) / height
        height = MAX_IMAGE_HEIGHT
      }

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }

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
              0.6
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

    const reader = new FileReader()
    reader.onload = () => {
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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
          maximumAge: 60000,
        }
      )
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
  } catch {
    return null
  }
}

export function PhotoCapture({
  category,
  onCapture,
  variant = 'default',
  className,
}: PhotoCaptureProps) {
  const { addPhoto, currentSurveyId, organizationId } = useSurveyStore()
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

      // Upload path is {orgId}/surveys/{surveyId}/... and storage RLS keys
      // the first folder segment to the caller's org. Queuing with an empty
      // org id (possible if useMultiTenantAuth hasn't resolved yet) makes
      // every upload hit a permission error that's hard to diagnose from
      // "please retry". Refuse to add the photo in that window instead.
      if (!organizationId) {
        setError('Still loading your account — give it a second and try again.')
        setIsProcessing(false)
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      const isVideo = file.type.startsWith('video/')

      try {
        if (isVideo) {
          // Videos bypass the offline queue entirely — base64 in
          // localStorage would blow the quota and corrupt every other
          // pending upload. Require an active connection up front so the
          // surveyor sees a clear message instead of a silent failure.
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            throw new Error(
              'Videos need an internet connection to upload. Reconnect and try again.',
            )
          }

          if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
            throw new Error(
              `Video is too large (max ${MAX_VIDEO_SIZE_MB} MB). Trim it or shoot at lower quality.`,
            )
          }

          if (!currentSurveyId) {
            throw new Error('Save the survey before attaching media.')
          }

          const gpsCoordinates = await getGPSCoordinates()
          const timestamp = new Date().toISOString()
          const mediaId = `media-${Date.now()}-${nanoid(9)}`
          const mimeType = file.type || 'video/mp4'

          const { path, signedUrl } = await uploadSurveyMediaBlob({
            organizationId,
            surveyId: currentSurveyId,
            category,
            mediaId,
            blob: file,
            mimeType,
          })

          // Record the uploaded video in survey state. The signed URL
          // is for in-wizard preview only; persistence uses `path`,
          // which is re-signed on render so the URL never goes stale.
          addPhoto({
            blob: null,
            dataUrl: signedUrl,
            path,
            timestamp,
            gpsCoordinates,
            category,
            area_id: null,
            location: '',
            caption: '',
            mediaType: 'video',
            mimeType,
            fileSize: file.size,
          })

          onCapture?.()

          logger.debug(
            { category, sizeKB: Math.round(file.size / 1024), hasGPS: !!gpsCoordinates },
            'Video captured',
          )
          return
        }

        // Image path — extract EXIF first (compress strips it), then
        // compress for upload, queue, and upload in background.
        const gpsPromise = getGPSCoordinates()
        const exifPromise = extractClientExif(file)

        const { dataUrl, blob } = await compressImage(file)

        const [gpsCoordinates, clientExif] = await Promise.all([
          gpsPromise,
          exifPromise,
        ])

        // EXIF GPS wins over the geolocation API reading — the camera
        // wrote it at shutter time, the geolocation reading happened
        // a beat later and may have less accuracy.
        const effectiveGps =
          clientExif.exifGps
            ? {
                latitude: clientExif.exifGps.lat,
                longitude: clientExif.exifGps.lng,
              }
            : gpsCoordinates

        const timestamp = clientExif.exifCapturedAt ?? clientExif.clientCapturedAt

        const photoId = addPhoto({
          blob,
          dataUrl,
          path: null,
          timestamp,
          gpsCoordinates: effectiveGps,
          category,
          area_id: null,
          location: '',
          caption: '',
          mediaType: 'image',
          mimeType: 'image/jpeg',
          fileSize: blob.size,
          captured_at: timestamp,
          captured_lat: effectiveGps?.latitude ?? null,
          captured_lng: effectiveGps?.longitude ?? null,
          device_make: clientExif.deviceMake,
          device_model: clientExif.deviceModel,
          stamp_status: 'pending',
        })

        if (currentSurveyId) {
          addToQueue({
            surveyId: currentSurveyId,
            organizationId,
            localUri: dataUrl,
            category,
            location: '',
            caption: '',
            gpsCoordinates: effectiveGps,
            fileSize: blob.size,
            fileType: 'image/jpeg',
            mediaType: 'image',
            exifCapturedAt: clientExif.exifCapturedAt,
            clientCapturedAt: clientExif.clientCapturedAt,
            exifGps: clientExif.exifGps,
            deviceMake: clientExif.deviceMake,
            deviceModel: clientExif.deviceModel,
          })

          if (navigator.onLine) {
            setTimeout(() => processPhotoQueue(), 100)
          }
        }

        onCapture?.()

        logger.debug({
          photoId,
          category,
          sizeKB: Math.round(blob.size / 1024),
          hasGPS: !!effectiveGps,
          hasExifTime: !!clientExif.exifCapturedAt,
        }, 'Photo captured')
      } catch (err) {
        logger.error(
          {
            error: formatError(err, 'PHOTO_PROCESSING_ERROR'),
            category,
            isVideo,
          },
          'Error processing media',
        )
        setError(err instanceof Error ? err.message : 'Failed to process file')
      } finally {
        setIsProcessing(false)
        if (inputRef.current) {
          inputRef.current.value = ''
        }
      }
    },
    [addPhoto, addToQueue, category, currentSurveyId, organizationId, onCapture]
  )

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
          aria-label="Take a photo with the camera"
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
          aria-label="Take a photo with the camera"
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
              <span>Take Photo</span>
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
        aria-label="Take a photo with the camera"
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
