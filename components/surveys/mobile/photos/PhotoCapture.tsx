'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { PhotoCategory } from '@/lib/stores/survey-types'
import { Camera, Loader2 } from 'lucide-react'

interface PhotoCaptureProps {
  category: PhotoCategory
  onCapture?: () => void
}

export function PhotoCapture({ category, onCapture }: PhotoCaptureProps) {
  const { addPhoto } = useSurveyStore()
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
      // Convert to data URL for storage
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

      addPhoto({
        blob: file,
        dataUrl,
        timestamp: new Date().toISOString(),
        gpsCoordinates,
        category,
        location: '',
        caption: '',
      })

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
