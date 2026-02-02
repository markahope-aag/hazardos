'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Mic, Square, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

interface VoiceNoteButtonProps {
  onRecordingComplete?: (blob: Blob) => void
  className?: string
  disabled?: boolean
}

export function VoiceNoteButton({
  onRecordingComplete,
  className,
  disabled = false,
}: VoiceNoteButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup function for streams and intervals
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const startRecording = async () => {
    setError(null)
    audioChunksRef.current = []

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })
      streamRef.current = stream

      // Create MediaRecorder with supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        onRecordingComplete?.(audioBlob)
        cleanup()
      }

      mediaRecorder.onerror = () => {
        setError('Recording error occurred')
        cleanup()
        setIsRecording(false)
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)

      // Start duration timer
      const startTime = Date.now()
      intervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } catch (err) {
      console.error('Error starting recording:', err)
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone permission denied')
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found')
        } else {
          setError('Could not access microphone')
        }
      } else {
        setError('Failed to start recording')
      }
      cleanup()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRecording(false)
    setRecordingDuration(0)
  }

  const handlePress = () => {
    if (disabled) return

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        onClick={handlePress}
        disabled={disabled}
        className={cn(
          'min-h-[52px] touch-manipulation gap-2',
          isRecording && 'animate-pulse',
          className
        )}
      >
        {isRecording ? (
          <>
            <Square className="w-5 h-5" />
            <span>{formatDuration(recordingDuration)}</span>
            <span className="text-xs opacity-75">Tap to stop</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span>Voice Note</span>
          </>
        )}
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// Compact version for inline use
interface VoiceNoteIconButtonProps {
  onRecordingComplete?: (blob: Blob) => void
  className?: string
  disabled?: boolean
}

export function VoiceNoteIconButton({
  onRecordingComplete,
  className,
  disabled = false,
}: VoiceNoteIconButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const startRecording = async () => {
    setError(null)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        onRecordingComplete?.(audioBlob)
        cleanup()
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Microphone access denied')
      cleanup()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const handlePress = () => {
    if (disabled) return

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'ghost'}
      size="icon"
      onClick={handlePress}
      disabled={disabled}
      className={cn(
        'min-w-[48px] min-h-[48px] touch-manipulation',
        isRecording && 'animate-pulse',
        error && 'border-destructive',
        className
      )}
      aria-label={isRecording ? 'Stop recording' : 'Start voice note'}
      title={error || undefined}
    >
      {isRecording ? (
        <Square className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </Button>
  )
}
