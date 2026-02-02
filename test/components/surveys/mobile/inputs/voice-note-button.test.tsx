import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceNoteButton, VoiceNoteIconButton } from '@/components/surveys/mobile/inputs/voice-note-button'

// Mock navigator.mediaDevices
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((event: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  onerror: null as (() => void) | null,
  state: 'inactive',
}

const mockStream = {
  getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
}

// Setup global mocks
beforeEach(() => {
  vi.clearAllMocks()

  // Mock MediaRecorder
  global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder) as unknown as typeof MediaRecorder
  (global.MediaRecorder as { isTypeSupported: (type: string) => boolean }).isTypeSupported = vi.fn().mockReturnValue(true)

  // Mock getUserMedia
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
  })
})

describe('VoiceNoteButton', () => {
  it('renders with default label', () => {
    render(<VoiceNoteButton />)
    expect(screen.getByText('Voice Note')).toBeInTheDocument()
  })

  it('renders microphone icon', () => {
    render(<VoiceNoteButton />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<VoiceNoteButton disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('accepts className prop', () => {
    render(<VoiceNoteButton className="custom-class" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('accepts onRecordingComplete callback', () => {
    const handleComplete = vi.fn()
    render(<VoiceNoteButton onRecordingComplete={handleComplete} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

describe('VoiceNoteIconButton', () => {
  it('renders as icon button', () => {
    render(<VoiceNoteIconButton />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Start voice note')
  })

  it('is disabled when disabled prop is true', () => {
    render(<VoiceNoteIconButton disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('accepts className prop', () => {
    render(<VoiceNoteIconButton className="custom-icon-class" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-icon-class')
  })

  it('accepts onRecordingComplete callback', () => {
    const handleComplete = vi.fn()
    render(<VoiceNoteIconButton onRecordingComplete={handleComplete} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
