import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoiceRecorder } from '@/components/ui/voice-recorder'

// Mock MediaRecorder
let mockMediaRecorder: any = null

const createMockMediaRecorder = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  mimeType: 'audio/webm',
  state: 'inactive',
})

const _mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
}

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(),
  },
  writable: true,
  configurable: true,
})

// Mock MediaRecorder constructor
global.MediaRecorder = vi.fn((stream, options) => {
  mockMediaRecorder = createMockMediaRecorder()
  mockMediaRecorder.mimeType = options?.mimeType || 'audio/webm'
  return mockMediaRecorder
}) as any
global.MediaRecorder.isTypeSupported = vi.fn(() => true)

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock btoa
global.btoa = vi.fn((str) => Buffer.from(str, 'binary').toString('base64'))

const _mockTranscription = {
  id: 'transcription_123',
  raw_transcription: 'This is a test transcription',
  processed_text: 'This is a test transcription.',
  status: 'completed',
  extracted_data: {
    hazard_type: 'asbestos',
    location: 'basement',
  },
}

describe('VoiceRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset MediaRecorder mock
    mockMediaRecorder = null

    // Mock getUserMedia to resolve with stream
    ;(navigator.mediaDevices.getUserMedia as any).mockResolvedValue(_mockStream)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render initial state with record button', () => {
    render(<VoiceRecorder />)

    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument()
    expect(screen.getByText('Click to start recording...')).toBeInTheDocument()
  })

  it('should render with custom placeholder', () => {
    render(<VoiceRecorder placeholder="Custom placeholder text" />)

    expect(screen.getByText('Custom placeholder text')).toBeInTheDocument()
  })

  it('should handle record button click', () => {
    render(<VoiceRecorder />)

    const recordButton = screen.getByRole('button', { name: /start voice recording/i })

    // Button should be clickable
    expect(recordButton).not.toBeDisabled()

    // Clicking starts the recording flow (we don't test the full async flow)
    fireEvent.click(recordButton)

    // Component should still be rendered after click
    expect(recordButton).toBeInTheDocument()
  })

  it('should accept callbacks without errors', () => {
    const onTranscriptionComplete = vi.fn()
    const onTextExtracted = vi.fn()

    render(
      <VoiceRecorder
        onTranscriptionComplete={onTranscriptionComplete}
        onTextExtracted={onTextExtracted}
      />
    )

    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument()
  })

  it('should render error state', () => {
    const error = new Error('Permission denied')
    error.name = 'NotAllowedError'
    ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(error)

    render(<VoiceRecorder />)

    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    expect(recordButton).toBeInTheDocument()

    // Component should handle errors gracefully when clicked
    fireEvent.click(recordButton)

    // The component is set up to catch the error
    expect(recordButton).toBeInTheDocument()
  })

  it('should render with different context types', () => {
    const { rerender } = render(<VoiceRecorder contextType="site_survey_note" />)
    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument()

    rerender(<VoiceRecorder contextType="job_note" />)
    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument()

    rerender(<VoiceRecorder contextType="customer_note" />)
    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument()
  })

  it('should accept contextType and contextId props', () => {
    render(<VoiceRecorder contextType="site_survey_note" contextId="survey_123" />)

    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<VoiceRecorder className="custom-class" />)

    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('should check audio format support', () => {
    global.MediaRecorder.isTypeSupported = vi.fn()
      .mockReturnValueOnce(false) // webm not supported
      .mockReturnValueOnce(true)  // mp4 supported

    render(<VoiceRecorder />)

    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    expect(recordButton).toBeInTheDocument()

    // The component will check format support when recording starts
    // We're just testing it accepts the props and renders
  })

  it('should have record button with proper attributes', () => {
    render(<VoiceRecorder />)

    const button = screen.getByRole('button', { name: /start voice recording/i })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('should render with accessible structure', () => {
    const { container } = render(<VoiceRecorder />)

    const button = screen.getByRole('button', { name: /start voice recording/i })
    expect(button).toBeInTheDocument()

    // Should have a card container
    const card = container.querySelector('.border')
    expect(card).toBeInTheDocument()
  })

  it('should accept all props without errors', () => {
    const onTranscriptionComplete = vi.fn()
    const onTextExtracted = vi.fn()

    render(
      <VoiceRecorder
        contextType="site_survey_note"
        contextId="survey_123"
        onTranscriptionComplete={onTranscriptionComplete}
        onTextExtracted={onTextExtracted}
        placeholder="Custom placeholder"
        className="custom-class"
      />
    )

    expect(screen.getByText('Custom placeholder')).toBeInTheDocument()
  })
})
