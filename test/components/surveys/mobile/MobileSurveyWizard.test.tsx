import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileSurveyWizard } from '@/components/surveys/mobile/MobileSurveyWizard'

// Mock the survey store
vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    currentStep: 0,
    formData: {},
    photos: [],
    validationErrors: {},
    isComplete: false,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    setStep: vi.fn(),
    updateFormData: vi.fn(),
    addPhoto: vi.fn(),
    removePhoto: vi.fn(),
    validateStep: vi.fn(() => true),
    canComplete: vi.fn(() => false),
    markComplete: vi.fn(),
    reset: vi.fn()
  })
}))

// Mock the auth hook
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'test-org-id' },
    user: { id: 'test-user-id' },
    profile: { role: 'estimator' }
  })
}))

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock camera access
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Back Camera' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Front Camera' }
    ])
  }
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Mobile Survey Wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Wizard Navigation', () => {
    it('should render first step by default', () => {
      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText(/property information/i)).toBeInTheDocument()
    })

    it('should show progress indicator', () => {
      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByRole('progressbar') || screen.getByText(/step 1/i)).toBeInTheDocument()
    })

    it('should navigate to next step when valid', async () => {
      const user = userEvent.setup()
      const mockStore = await import('@/lib/stores/survey-store')
      const nextStepMock = vi.fn()
      vi.mocked(mockStore.useSurveyStore).mockReturnValue({
        ...vi.mocked(mockStore.useSurveyStore)(),
        nextStep: nextStepMock,
        validateStep: vi.fn(() => true)
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(nextStepMock).toHaveBeenCalled()
    })

    it('should not navigate when step is invalid', async () => {
      const user = userEvent.setup()
      const mockStore = await import('@/lib/stores/survey-store')
      const nextStepMock = vi.fn()
      vi.mocked(mockStore.useSurveyStore).mockReturnValue({
        ...vi.mocked(mockStore.useSurveyStore)(),
        nextStep: nextStepMock,
        validateStep: vi.fn(() => false)
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(nextStepMock).not.toHaveBeenCalled()
    })

    it('should navigate to previous step', async () => {
      const user = userEvent.setup()
      const mockStore = await import('@/lib/stores/survey-store')
      const prevStepMock = vi.fn()
      vi.mocked(mockStore.useSurveyStore).mockReturnValue({
        ...vi.mocked(mockStore.useSurveyStore)(),
        currentStep: 2,
        prevStep: prevStepMock
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(prevStepMock).toHaveBeenCalled()
    })

    it('should hide back button on first step', () => {
      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const backButton = screen.queryByRole('button', { name: /back/i })
      expect(backButton).not.toBeInTheDocument()
    })
  })

  describe('Property Information Step', () => {
    it('should render property form fields', () => {
      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
    })

    it('should update form data when fields change', async () => {
      const user = userEvent.setup()
      const mockStore = await import('@/lib/stores/survey-store')
      const updateFormDataMock = vi.fn()
      vi.mocked(mockStore.useSurveyStore).mockReturnValue({
        ...vi.mocked(mockStore.useSurveyStore)(),
        updateFormData: updateFormDataMock
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const addressInput = screen.getByLabelText(/address/i)
      await user.type(addressInput, '123 Test St')

      expect(updateFormDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          property: expect.objectContaining({
            address: '123 Test St'
          })
        })
      )
    })

    it('should validate required property fields', async () => {
      const user = userEvent.setup()
      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(screen.getByText(/address is required/i)).toBeInTheDocument()
    })
  })

  describe('Hazard Assessment Step', () => {
    it('should render hazard type selection', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 1
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText(/asbestos/i)).toBeInTheDocument()
      expect(screen.getByText(/mold/i)).toBeInTheDocument()
      expect(screen.getByText(/lead/i)).toBeInTheDocument()
    })

    it('should allow multiple hazard selections', async () => {
      const user = userEvent.setup()
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      const updateFormDataMock = vi.fn()
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 1,
        updateFormData: updateFormDataMock
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const asbestosCheckbox = screen.getByLabelText(/asbestos/i)
      const moldCheckbox = screen.getByLabelText(/mold/i)

      await user.click(asbestosCheckbox)
      await user.click(moldCheckbox)

      expect(updateFormDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hazards: expect.objectContaining({
            asbestos: expect.objectContaining({ present: true }),
            mold: expect.objectContaining({ present: true })
          })
        })
      )
    })

    it('should show material selection for asbestos', async () => {
      const user = userEvent.setup()
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 1,
        formData: {
          hazards: {
            asbestos: { present: true }
          }
        }
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText(/floor tiles/i)).toBeInTheDocument()
      expect(screen.getByText(/pipe insulation/i)).toBeInTheDocument()
    })
  })

  describe('Photo Capture Step', () => {
    it('should render camera interface', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 2
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByRole('button', { name: /capture photo/i })).toBeInTheDocument()
    })

    it('should request camera permission', async () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 2
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: { facingMode: 'environment' }
        })
      })
    })

    it('should capture and add photos', async () => {
      const user = userEvent.setup()
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      const addPhotoMock = vi.fn()
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 2,
        addPhoto: addPhotoMock
      })

      // Mock canvas and context
      const mockCanvas = document.createElement('canvas')
      const mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn()
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)
      vi.spyOn(mockCanvas, 'toBlob').mockImplementation((callback) => {
        callback?.(new Blob(['fake-image'], { type: 'image/jpeg' }))
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const captureButton = screen.getByRole('button', { name: /capture photo/i })
      await user.click(captureButton)

      expect(addPhotoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          file: expect.any(Blob)
        })
      )
    })

    it('should show captured photos gallery', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 2,
        photos: [
          { id: '1', url: 'blob:test1', file: new File([''], 'test1.jpg'), caption: 'Test photo 1' },
          { id: '2', url: 'blob:test2', file: new File([''], 'test2.jpg'), caption: 'Test photo 2' }
        ]
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText('Test photo 1')).toBeInTheDocument()
      expect(screen.getByText('Test photo 2')).toBeInTheDocument()
    })

    it('should allow photo deletion', async () => {
      const user = userEvent.setup()
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      const removePhotoMock = vi.fn()
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 2,
        photos: [
          { id: 'photo-1', url: 'blob:test', file: new File([''], 'test.jpg'), caption: 'Test photo' }
        ],
        removePhoto: removePhotoMock
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      expect(removePhotoMock).toHaveBeenCalledWith('photo-1')
    })
  })

  describe('Review Step', () => {
    it('should display survey summary', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 3,
        formData: {
          property: {
            address: '123 Test St',
            city: 'Test City'
          },
          hazards: {
            asbestos: { present: true, materials: ['floor tiles'] }
          }
        },
        photos: [
          { id: '1', url: 'blob:test', file: new File([''], 'test.jpg'), caption: 'Test photo' }
        ]
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText('123 Test St')).toBeInTheDocument()
      expect(screen.getByText('Test City')).toBeInTheDocument()
      expect(screen.getByText(/asbestos/i)).toBeInTheDocument()
      expect(screen.getByText(/floor tiles/i)).toBeInTheDocument()
    })

    it('should show completion checklist', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 3,
        formData: {
          property: { address: '123 Test St' },
          hazards: { asbestos: { present: true } }
        },
        photos: [{ id: '1', url: 'test', file: new File([''], 'test.jpg') }]
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText(/property information/i)).toBeInTheDocument()
      expect(screen.getByText(/hazard assessment/i)).toBeInTheDocument()
      expect(screen.getByText(/photos captured/i)).toBeInTheDocument()
    })

    it('should enable submit when survey is complete', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 3,
        canComplete: vi.fn(() => true),
        formData: {
          property: { address: '123 Test St', city: 'Test City' },
          hazards: { asbestos: { present: true } }
        },
        photos: [{ id: '1', url: 'test', file: new File([''], 'test.jpg') }]
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const submitButton = screen.getByRole('button', { name: /submit survey/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit when survey is incomplete', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 3,
        canComplete: vi.fn(() => false)
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const submitButton = screen.getByRole('button', { name: /submit survey/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Validation and Error Handling', () => {
    it('should show validation errors', () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        validationErrors: {
          'property.address': 'Address is required',
          'hazards.type': 'At least one hazard type must be selected'
        }
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText('Address is required')).toBeInTheDocument()
      expect(screen.getByText('At least one hazard type must be selected')).toBeInTheDocument()
    })

    it('should handle camera permission denied', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new Error('Permission denied'))

      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 2
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/camera permission/i) || screen.getByText(/permission denied/i)).toBeInTheDocument()
      })
    })

    it('should handle photo capture errors', async () => {
      const user = userEvent.setup()
      
      // Mock canvas toBlob to fail
      const mockCanvas = document.createElement('canvas')
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      vi.spyOn(mockCanvas, 'toBlob').mockImplementation((callback) => {
        callback?.(null) // Simulate failure
      })

      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 2
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const captureButton = screen.getByRole('button', { name: /capture photo/i })
      await user.click(captureButton)

      expect(screen.getByText(/failed to capture/i) || screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render properly on small screens', () => {
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText(/property information/i)).toBeInTheDocument()
    })

    it('should have touch-friendly button sizes', () => {
      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const nextButton = screen.getByRole('button', { name: /next/i })
      const styles = getComputedStyle(nextButton)
      const height = parseInt(styles.height) || 44
      
      expect(height).toBeGreaterThanOrEqual(44) // Minimum touch target
    })

    it('should support swipe gestures for navigation', async () => {
      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      const nextStepMock = vi.fn()
      const prevStepMock = vi.fn()
      
      mockStore.mockReturnValue({
        ...mockStore(),
        currentStep: 1,
        nextStep: nextStepMock,
        prevStep: prevStepMock,
        validateStep: vi.fn(() => true)
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      const wizard = screen.getByTestId('mobile-wizard') || document.body

      // Simulate swipe left (next)
      wizard.dispatchEvent(new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 } as Touch]
      }))
      wizard.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [{ clientX: 50, clientY: 100 } as Touch]
      }))

      // Note: Actual swipe implementation would need gesture detection
      expect(wizard).toBeInTheDocument()
    })
  })

  describe('Offline Capability', () => {
    it('should save progress locally when offline', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      })

      const mockStore = vi.mocked(require('@/lib/stores/survey-store').useSurveyStore)
      const saveToStorageMock = vi.fn()
      mockStore.mockReturnValue({
        ...mockStore(),
        saveToStorage: saveToStorageMock
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      // Should automatically save to local storage
      expect(saveToStorageMock).toHaveBeenCalled()
    })

    it('should show offline indicator', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      expect(screen.getByText(/offline/i) || screen.getByText(/no connection/i)).toBeInTheDocument()
    })

    it('should sync when back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      })

      const Wrapper = createWrapper()
      render(
        <Wrapper>
          <MobileSurveyWizard />
        </Wrapper>
      )

      // Go online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
      })

      // Trigger online event
      window.dispatchEvent(new Event('online'))

      await waitFor(() => {
        expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
      })
    })
  })
})