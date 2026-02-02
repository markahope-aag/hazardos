import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoCapture } from '@/components/surveys/mobile/photos/photo-capture'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock stores
const mockAddPhoto = vi.fn()
const mockAddToQueue = vi.fn()

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    addPhoto: mockAddPhoto,
    currentSurveyId: 'survey-123',
  }),
}))

vi.mock('@/lib/stores/photo-queue-store', () => ({
  usePhotoQueueStore: () => ({
    addPhoto: mockAddToQueue,
  }),
}))

// Mock photo upload service
vi.mock('@/lib/services/photo-upload-service', () => ({
  processPhotoQueue: vi.fn(),
}))

// Mock file input
const createMockFile = (name: string, type: string, size: number) => {
  const file = new File(['mock content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Mock FileReader
class MockFileReader {
  onload: ((event: any) => void) | null = null
  onloadend: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  result: string | ArrayBuffer | null = null

  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mockdata'
      if (this.onloadend) {
        this.onloadend({ target: { result: this.result } })
      }
      if (this.onload) {
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  }
}

global.FileReader = MockFileReader as any

// Mock canvas and image
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn((callback) => {
    setTimeout(() => {
      callback(new Blob(['mock'], { type: 'image/jpeg', size: 1024 }))
    }, 0)
  }),
  width: 0,
  height: 0,
}

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext as any
global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob as any

// Mock Image
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  width = 1920
  height = 1080

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
}

global.Image = MockImage as any

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => {
    setTimeout(() => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      })
    }, 0)
  }),
}

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

describe('PhotoCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddPhoto.mockReturnValue('photo-123')
  })

  it('should render default photo capture button', () => {
    render(<PhotoCapture category="general" />)

    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
    expect(screen.getByText('Take Photo')).toBeInTheDocument()
  })

  it('should render compact variant with camera icon only', () => {
    render(<PhotoCapture category="general" variant="compact" />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Compact variant should not have text
    expect(button).not.toHaveTextContent('Take Photo')
  })

  it('should render inline variant with add photo text', () => {
    render(<PhotoCapture category="general" variant="inline" />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.getByText('Add Photo')).toBeInTheDocument()
  })

  it('should have hidden file input', () => {
    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveClass('hidden')
    expect(fileInput).toHaveAttribute('accept', 'image/*')
    expect(fileInput).toHaveAttribute('capture', 'environment')
  })

  it('should trigger file input when button is clicked', () => {
    render(<PhotoCapture category="general" />)

    const button = screen.getByRole('button', { name: /take photo/i })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    const clickSpy = vi.spyOn(fileInput, 'click')
    fireEvent.click(button)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('should handle file selection and process photo', async () => {
    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(mockAddPhoto).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should show processing state during photo handling', async () => {
    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    // Should show processing text briefly
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })
  })

  it('should call onCapture callback when photo is captured', async () => {
    const onCapture = vi.fn()
    render(<PhotoCapture category="general" onCapture={onCapture} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should handle image compression errors gracefully', async () => {
    // Mock Image to fail loading
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''

      constructor() {
        setTimeout(() => {
          if (this.onerror) this.onerror()
        }, 0)
      }
    } as any

    render(<PhotoCapture category="general" variant="default" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/failed to load image/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // Restore mock
    global.Image = MockImage as any
  })

  it('should apply custom className', () => {
    render(<PhotoCapture category="general" className="custom-class" />)

    const container = screen.getByRole('button', { name: /take photo/i }).closest('div')
    expect(container).toHaveClass('custom-class')
  })

  it('should handle different photo categories', () => {
    const categories = ['general', 'hazard', 'damage', 'before', 'after'] as const

    categories.forEach(category => {
      const { unmount } = render(<PhotoCapture category={category} />)

      expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()

      unmount()
    })
  })

  it('should disable button during processing', async () => {
    render(<PhotoCapture category="general" />)

    const button = screen.getByRole('button', { name: /take photo/i })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    // Button should be disabled during processing
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  it('should show retry button on error in default variant', async () => {
    // Mock Image to fail loading
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''

      constructor() {
        setTimeout(() => {
          if (this.onerror) this.onerror()
        }, 0)
      }
    } as any

    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    }, { timeout: 3000 })

    // Restore mock
    global.Image = MockImage as any
  })

  it('should clear error state when retry is clicked', async () => {
    // Mock Image to fail initially
    let shouldFail = true
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''

      constructor() {
        setTimeout(() => {
          if (shouldFail && this.onerror) {
            this.onerror()
          } else if (this.onload) {
            this.onload()
          }
        }, 0)
      }
    } as any

    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    // Create spy before clicking retry
    const clickSpy = vi.spyOn(fileInput, 'click')

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/failed to load image/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // Now make Image succeed
    shouldFail = false

    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)

    // File input should be clicked again
    expect(clickSpy).toHaveBeenCalled()

    // Restore mock
    global.Image = MockImage as any
  })

  it('should have proper accessibility attributes', () => {
    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toHaveAttribute('accept', 'image/*')
    expect(fileInput).toHaveAttribute('aria-label', 'Capture photo')
  })

  it('should show error for canvas context failure', async () => {
    // Mock canvas context to return null
    const originalGetContext = global.HTMLCanvasElement.prototype.getContext
    global.HTMLCanvasElement.prototype.getContext = vi.fn(() => null)

    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/could not get canvas context/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // Restore
    global.HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('should reset file input value after processing', async () => {
    render(<PhotoCapture category="general" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)

    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(mockAddPhoto).toHaveBeenCalled()
    }, { timeout: 3000 })

    // Input value should be reset
    expect(fileInput.value).toBe('')
  })
})
