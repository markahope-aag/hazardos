'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Video, Upload, X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import imageCompression from 'browser-image-compression'

interface MediaFile {
  id: string
  file: File
  type: 'image' | 'video'
  url: string
  compressed?: boolean
  originalSize: number
  compressedSize?: number
  caption?: string
}

interface MediaUploadProps {
  onMediaChange: (media: MediaFile[]) => void
  maxFiles?: number
  maxVideoSizeMB?: number
  maxImageSizeMB?: number
}

export function MediaUpload({ 
  onMediaChange, 
  maxFiles = 20, 
  maxVideoSizeMB = 50, 
  maxImageSizeMB = 5 
}: MediaUploadProps) {
  const { toast } = useToast()
  const [media, setMedia] = useState<MediaFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compress image files
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: maxImageSizeMB,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
      initialQuality: 0.8,
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return new File([compressedFile], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      })
    } catch (error) {
      logger.error(
        { 
          error: formatError(error, 'IMAGE_COMPRESSION_ERROR'),
          fileName: file.name,
          fileSize: file.size
        },
        'Image compression failed'
      )
      return file
    }
  }

  // Compress video files
  const compressVideo = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      video.onloadedmetadata = () => {
        // Set canvas dimensions (max 1280x720 for mobile)
        const maxWidth = 1280
        const maxHeight = 720
        let { videoWidth, videoHeight } = video

        if (videoWidth > maxWidth) {
          videoHeight = (videoHeight * maxWidth) / videoWidth
          videoWidth = maxWidth
        }
        if (videoHeight > maxHeight) {
          videoWidth = (videoWidth * maxHeight) / videoHeight
          videoHeight = maxHeight
        }

        canvas.width = videoWidth
        canvas.height = videoHeight

        // Create MediaRecorder for compression
        const stream = canvas.captureStream(30) // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 1000000, // 1 Mbps
        })

        const chunks: Blob[] = []
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' })
          const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
            type: 'video/webm',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        }

        // Draw video frames to canvas and record
        const drawFrame = () => {
          if (video.ended) {
            mediaRecorder.stop()
            return
          }
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight)
          requestAnimationFrame(drawFrame)
        }

        video.play()
        mediaRecorder.start()
        drawFrame()
      }

      video.onerror = () => reject(new Error('Video processing failed'))
      video.src = URL.createObjectURL(file)
    })
  }

  const processFiles = async (files: FileList) => {
    if (media.length + files.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    const newMedia: MediaFile[] = []
    const totalFiles = files.length

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      if (!isImage && !isVideo) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported image or video file`,
          variant: 'destructive',
        })
        continue
      }

      // Check file size limits
      const fileSizeMB = file.size / (1024 * 1024)
      if (isVideo && fileSizeMB > maxVideoSizeMB) {
        toast({
          title: 'Video too large',
          description: `${file.name} exceeds ${maxVideoSizeMB}MB limit`,
          variant: 'destructive',
        })
        continue
      }

      try {
        let processedFile = file
        let compressed = false

        if (isImage && fileSizeMB > 1) {
          processedFile = await compressImage(file)
          compressed = true
        } else if (isVideo && fileSizeMB > 10) {
          processedFile = await compressVideo(file)
          compressed = true
        }

        const mediaFile: MediaFile = {
          id: `${Date.now()}-${i}`,
          file: processedFile,
          type: isImage ? 'image' : 'video',
          url: URL.createObjectURL(processedFile),
          compressed,
          originalSize: file.size,
          compressedSize: compressed ? processedFile.size : undefined,
        }

        newMedia.push(mediaFile)
        setProcessingProgress(((i + 1) / totalFiles) * 100)
      } catch (error) {
        logger.error(
          { 
            error: formatError(error, 'FILE_PROCESSING_ERROR'),
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          },
          'Error processing file'
        )
        toast({
          title: 'Processing failed',
          description: `Failed to process ${file.name}`,
          variant: 'destructive',
        })
      }
    }

    const updatedMedia = [...media, ...newMedia]
    setMedia(updatedMedia)
    onMediaChange(updatedMedia)
    setIsProcessing(false)
    setProcessingProgress(0)

    if (newMedia.length > 0) {
      toast({
        title: 'Media added',
        description: `Added ${newMedia.length} file(s) to assessment`,
      })
    }
  }

  const removeMedia = (id: string) => {
    const updatedMedia = media.filter(m => {
      if (m.id === id) {
        URL.revokeObjectURL(m.url)
        return false
      }
      return true
    })
    setMedia(updatedMedia)
    onMediaChange(updatedMedia)
  }

  const updateCaption = (id: string, caption: string) => {
    const updatedMedia = media.map(m => 
      m.id === id ? { ...m, caption } : m
    )
    setMedia(updatedMedia)
    onMediaChange(updatedMedia)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openCamera = async (video = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: video
      })

      // For now, we'll use the file input as fallback
      // In a production app, you'd implement a camera interface
      if (fileInputRef.current) {
        fileInputRef.current.accept = video ? 'video/*' : 'image/*'
        fileInputRef.current.capture = 'environment'
        fileInputRef.current.click()
      }

      // Clean up stream
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      logger.error(
        { error: formatError(error, 'CAMERA_ACCESS_ERROR') },
        'Camera access failed'
      )
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera access or select files manually',
        variant: 'destructive',
      })
      
      // Fallback to file picker
      if (fileInputRef.current) {
        fileInputRef.current.accept = video ? 'video/*' : 'image/*'
        fileInputRef.current.click()
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => openCamera(false)}
          className="flex flex-col items-center p-4 h-auto"
        >
          <Camera className="h-6 w-6 mb-1" />
          <span className="text-xs">Take Photo</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => openCamera(true)}
          className="flex flex-col items-center p-4 h-auto"
        >
          <Video className="h-6 w-6 mb-1" />
          <span className="text-xs">Record Video</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center p-4 h-auto"
        >
          <Upload className="h-6 w-6 mb-1" />
          <span className="text-xs">Upload Files</span>
        </Button>

        <div className="flex flex-col items-center justify-center p-2 text-xs text-gray-500">
          <span>{media.length}/{maxFiles}</span>
          <span>files</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Processing indicator */}
      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Processing files... {Math.round(processingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {media.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-square">
                {item.type === 'image' ? (
                  <Image
                    src={item.url}
                    alt="Assessment photo"
                    className="w-full h-full object-cover"
                    width={200}
                    height={200}
                  />
                ) : (
                  <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-8 w-8 text-white bg-black bg-opacity-50 rounded-full p-1" />
                    </div>
                  </div>
                )}

                {/* Remove button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeMedia(item.id)}
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>

                {/* Compression indicator */}
                {item.compressed && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-1 rounded">
                    Compressed
                  </div>
                )}
              </div>

              <CardContent className="p-3">
                {/* File size info */}
                <div className="text-xs text-gray-500 mb-2">
                  {formatFileSize(item.compressedSize || item.originalSize)}
                  {item.compressed && (
                    <span className="text-green-600">
                      {' '}(saved {formatFileSize(item.originalSize - (item.compressedSize || 0))})
                    </span>
                  )}
                </div>

                {/* Caption input */}
                <input
                  type="text"
                  placeholder="Add caption..."
                  value={item.caption || ''}
                  onChange={(e) => updateCaption(item.id, e.target.value)}
                  className="w-full text-xs p-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Size limits info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Photos: Automatically compressed to {maxImageSizeMB}MB max</p>
        <p>• Videos: Compressed if over 10MB (max {maxVideoSizeMB}MB)</p>
        <p>• Maximum {maxFiles} files per assessment</p>
      </div>
    </div>
  )
}