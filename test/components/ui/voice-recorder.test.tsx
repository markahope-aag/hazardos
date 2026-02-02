import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VoiceRecorder } from '@/components/ui/voice-recorder'

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  mimeType: 'audio/webm',
}

const mockStream = {
  getTracks: vi.fn(function() { return [{ stop: vi.fn() }] }),
}

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(),
  },
  writable: true,
})

// Mock MediaRecorder constructor
global.MediaRecorder = vi.fn(function(stream, options) {
  return mockMediaRecorder
}) as any
global.MediaRecorder.isTypeSupported = vi.fn(function(type) { return true })

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock btoa
global.btoa = vi.fn(function(str) { return Buffer.from(str, 'binary').toString('base64') })

const mockTranscription = {
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
    Object.assign(mockMediaRecorder, {
      start: vi.fn(),
      stop: vi.fn(),
      ondataavailable: null,
      onstop: null,
      mimeType: 'audio/webm',
    })

    // Mock getUserMedia to resolve with stream
    ;(navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream)
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

  it('should start recording when button is clicked', async () => {
    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(mockMediaRecorder.start).toHaveBeenCalled()
    })

    expect(screen.getByText('Recording...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument()
  })

  it('should show recording timer', async () => {
    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Initially shows 0:00
    expect(screen.getByText('0:00')).toBeInTheDocument()

    // Advance timer by 5 seconds
    vi.advanceTimersByTime(5000)

    await waitFor(() => {
      expect(screen.getByText('0:05')).toBeInTheDocument()
    })
  })

  it('should stop recording when stop button is clicked', async () => {
    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    const stopButton = screen.getByRole('button', { name: /stop recording/i })
    fireEvent.click(stopButton)

    expect(mockMediaRecorder.stop).toHaveBeenCalled()
  })

  it('should handle microphone permission denied', async () => {
    const error = new Error('Permission denied')
    error.name = 'NotAllowedError'
    ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(error)

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Microphone access denied. Please allow microphone access and try again.')).toBeInTheDocument()
    })
  })

  it('should handle general recording error', async () => {
    ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(new Error('Generic error'))

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to start recording. Please check your microphone.')).toBeInTheDocument()
    })
  })

  it('should show processing state after recording stops', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate MediaRecorder stop event
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.onstop()

    // Simulate data available event
    mockMediaRecorder.ondataavailable({ data: audioBlob })

    await waitFor(() => {
      expect(screen.getByText('Processing recording...')).toBeInTheDocument()
    })
  })

  it('should display transcription results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(screen.getByText('Transcription Complete')).toBeInTheDocument()
      expect(screen.getByText('This is a test transcription.')).toBeInTheDocument()
    })
  })

  it('should display extracted data from transcription', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(screen.getByText('Extracted Information:')).toBeInTheDocument()
      expect(screen.getByText('Hazard type:')).toBeInTheDocument()
      expect(screen.getByText('asbestos')).toBeInTheDocument()
      expect(screen.getByText('Location:')).toBeInTheDocument()
      expect(screen.getByText('basement')).toBeInTheDocument()
    })
  })

  it('should call onTranscriptionComplete callback', async () => {
    const onTranscriptionComplete = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(<VoiceRecorder onTranscriptionComplete={onTranscriptionComplete} />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(onTranscriptionComplete).toHaveBeenCalledWith(mockTranscription)
    })
  })

  it('should call onTextExtracted callback', async () => {
    const onTextExtracted = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(<VoiceRecorder onTextExtracted={onTextExtracted} />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(onTextExtracted).toHaveBeenCalledWith(
        'This is a test transcription.',
        mockTranscription.extracted_data
      )
    })
  })

  it('should clear transcription and allow new recording', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(screen.getByText('Transcription Complete')).toBeInTheDocument()
    })

    // Click "Record Another" button
    const recordAnotherButton = screen.getByRole('button', { name: /record another/i })
    fireEvent.click(recordAnotherButton)

    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument()
    expect(screen.queryByText('Transcription Complete')).not.toBeInTheDocument()
  })

  it('should handle transcription API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Transcription failed' }),
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(screen.getByText('Transcription failed')).toBeInTheDocument()
    })
  })

  it('should send context information with transcription request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(
      <VoiceRecorder 
        contextType="site_survey_note" 
        contextId="survey_123" 
      />
    )
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"context_type":"site_survey_note"'),
      })
    })
  })

  it('should handle different audio formats', async () => {
    global.MediaRecorder.isTypeSupported = vi.fn()
      .mockReturnValueOnce(false) // webm not supported
      .mockReturnValueOnce(true)  // mp4 supported

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(global.MediaRecorder).toHaveBeenCalledWith(
        mockStream,
        { mimeType: 'audio/mp4' }
      )
    })
  })

  it('should show status badge with correct color', async () => {
    const completedTranscription = { ...mockTranscription, status: 'completed' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => completedTranscription,
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      const badge = screen.getByText('completed')
      expect(badge).toHaveClass('bg-green-100', 'text-green-800')
    })
  })

  it('should format recording time correctly', async () => {
    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Test various time formats
    vi.advanceTimersByTime(65000) // 1 minute 5 seconds

    await waitFor(() => {
      expect(screen.getByText('1:05')).toBeInTheDocument()
    })
  })

  it('should clean up resources on unmount', async () => {
    const { unmount } = render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    unmount()

    // Should stop tracks
    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled()
  })

  it('should handle array values in extracted data', async () => {
    const transcriptionWithArray = {
      ...mockTranscription,
      extracted_data: {
        materials: ['asbestos', 'lead', 'mold'],
        locations: ['basement', 'attic'],
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => transcriptionWithArray,
    })

    render(<VoiceRecorder />)
    
    const recordButton = screen.getByRole('button', { name: /start voice recording/i })
    fireEvent.click(recordButton)

    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    // Simulate recording completion
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' })
    mockMediaRecorder.ondataavailable({ data: audioBlob })
    mockMediaRecorder.onstop()

    await waitFor(() => {
      expect(screen.getByText('asbestos, lead, mold')).toBeInTheDocument()
      expect(screen.getByText('basement, attic')).toBeInTheDocument()
    })
  })
})