import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoCapture } from '@/components/surveys/mobile/photos/PhotoCapture'

// Mock stores
const mockUseSurveyStore = {
  formData: {
    property: {
      address: '123 Main St',
    },
  },
}

const mockUsePhotoQueueStore = {
  addPhoto: vi.fn(),
  photos: [],
}

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => mockUseSurveyStore,
}))

vi.mock('@/lib/stores/photo-queue-store', () => ({
  usePhotoQueueStore: () => mockUsePhotoQueueStore,
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

// Mock canvas and image
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockdata'),
  toBlob: vi.fn((callback) => callback(new Blob(['mock'], { type: 'image/jpeg' }))),
  width: 0,
  height: 0,
}

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext
global.HTMLCanvasElement.prototype.toDataURL = mockCanvas.toDataURL
global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob

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

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('PhotoCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render default photo capture button', () => {
    render(<PhotoCapture category="general" />)
    
    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
    expect(screen.getByText('Take Photo')).toBeInTheDocument()
  })

  it('should render compact variant', () => {
    render(<PhotoCapture category="general" variant="compact" />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Compact variant should have smaller styling
    expect(button).toHaveClass('h-10', 'w-10')
  })

  it('should render inline variant', () => {
    render(<PhotoCapture category="general" variant="inline" />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('h-8', 'w-8')
  })

  it('should open file input when camera is not available', async () => {
    // Mock no camera available
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
    })

    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    // Should show file input fallback
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  it('should handle file selection from input', async () => {
    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024) // 1MB
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(mockUsePhotoQueueStore.addPhoto).toHaveBeenCalled()
    })
  })

  it('should show loading state during photo processing', async () => {
    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    // Should show loading state briefly
    expect(screen.getByRole('generic', { name: '' })).toHaveClass('animate-spin')
  })

  it('should reject files that are too large', async () => {
    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const largeMockFile = createMockFile('large.jpg', 'image/jpeg', 10 * 1024 * 1024) // 10MB
    
    fireEvent.change(fileInput, {
      target: { files: [largeMockFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument()
    })
  })

  it('should reject non-image files', async () => {
    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const textFile = createMockFile('document.txt', 'text/plain', 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [textFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/please select an image file/i)).toBeInTheDocument()
    })
  })

  it('should call onCapture callback when photo is captured', async () => {
    const onCapture = vi.fn()
    render(<PhotoCapture category="general" onCapture={onCapture} />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalled()
    })
  })

  it('should handle image compression errors', async () => {
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
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/failed to process image/i)).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    render(<PhotoCapture category="general" className="custom-class" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    expect(button.parentElement).toHaveClass('custom-class')
  })

  it('should handle multiple file selection', async () => {
    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile1 = createMockFile('test1.jpg', 'image/jpeg', 1024 * 1024)
    const mockFile2 = createMockFile('test2.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile1, mockFile2] },
    })

    await waitFor(() => {
      expect(mockUsePhotoQueueStore.addPhoto).toHaveBeenCalledTimes(2)
    })
  })

  it('should show error for canvas context failure', async () => {
    // Mock canvas context to return null
    mockCanvas.getContext.mockReturnValueOnce(null)

    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/failed to process image/i)).toBeInTheDocument()
    })
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
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    // Button should be disabled during processing
    expect(button).toBeDisabled()
  })

  it('should show retry button on error', async () => {
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
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('should clear error when retry is clicked', async () => {
    // Mock Image to fail loading initially
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
    
    const button = screen.getByRole('button', { name: /take photo/i })
    fireEvent.click(button)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024)
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    })

    await waitFor(() => {
      expect(screen.getByText(/failed to process image/i)).toBeInTheDocument()
    })

    // Now make Image succeed
    shouldFail = false
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.queryByText(/failed to process image/i)).not.toBeInTheDocument()
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<PhotoCapture category="general" />)
    
    const button = screen.getByRole('button', { name: /take photo/i })
    expect(button).toHaveAttribute('aria-label')
    
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toHaveAttribute('accept', 'image/*')
    expect(fileInput).toHaveAttribute('multiple')
  })
})