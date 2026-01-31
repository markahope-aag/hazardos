'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Mic, MicOff, Square } from 'lucide-react'
import { useState } from 'react'

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

  // UI-only for now - actual recording to be implemented later
  const handlePress = () => {
    if (disabled) return

    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setRecordingDuration(0)
      // TODO: Implement actual voice recording
      // onRecordingComplete?.(recordedBlob)
    } else {
      // Start recording
      setIsRecording(true)
      // TODO: Implement actual voice recording
      // Start duration timer
      const startTime = Date.now()
      const interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      // Store interval ID for cleanup
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
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

  const handlePress = () => {
    if (disabled) return
    setIsRecording(!isRecording)
    // TODO: Implement actual voice recording
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
        className
      )}
      aria-label={isRecording ? 'Stop recording' : 'Start voice note'}
    >
      {isRecording ? (
        <Square className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </Button>
  )
}
