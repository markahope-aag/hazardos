import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewSection } from '@/components/surveys/mobile/sections/review-section'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock hooks
let mockIsOnline = true
vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline,
}))

// Mock child components
vi.mock('@/components/surveys/mobile/review', () => ({
  CompletionChecklist: () => <div data-testid="completion-checklist">Checklist</div>,
  SurveySummary: () => <div data-testid="survey-summary">Summary</div>,
}))

vi.mock('@/components/surveys/mobile/photos', () => ({
  UploadStatus: () => <div data-testid="upload-status">Upload Status</div>,
}))

vi.mock('@/components/surveys/mobile/inputs', () => ({
  VoiceNoteButton: () => <button data-testid="voice-note">Voice Note</button>,
}))

// Mock photo queue store
vi.mock('@/lib/stores/photo-queue-store', () => ({
  usePhotoQueueStore: () => ({
    clearSurveyPhotos: vi.fn(),
    getPendingCount: () => 0,
    getFailedCount: () => 0,
  }),
}))

// Mock photo upload service
vi.mock('@/lib/services/photo-upload-service', () => ({
  processPhotoQueue: vi.fn(),
  waitForUploads: vi.fn().mockResolvedValue(true),
}))

// Mock survey store
const mockValidateAll = vi.fn()
const mockSubmitSurvey = vi.fn()
const mockSaveDraft = vi.fn()
const mockUpdateNotes = vi.fn()

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      notes: '',
    },
    updateNotes: mockUpdateNotes,
    validateAll: mockValidateAll,
    submitSurvey: mockSubmitSurvey,
    saveDraft: mockSaveDraft,
    currentSurveyId: 'survey-1',
    isSyncing: false,
    syncError: null,
  }),
}))

describe('ReviewSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline = true
    mockValidateAll.mockReturnValue(true)
    mockSubmitSurvey.mockResolvedValue(true)
    mockSaveDraft.mockResolvedValue(true)
  })

  it('renders Review & Submit header', () => {
    render(<ReviewSection />)

    expect(screen.getByText('Review & Submit')).toBeInTheDocument()
  })

  it('renders completion checklist', () => {
    render(<ReviewSection />)

    expect(screen.getByTestId('completion-checklist')).toBeInTheDocument()
    expect(screen.getByText('Completion Status')).toBeInTheDocument()
  })

  it('renders survey summary', () => {
    render(<ReviewSection />)

    expect(screen.getByTestId('survey-summary')).toBeInTheDocument()
    expect(screen.getByText('Survey Summary')).toBeInTheDocument()
  })

  it('renders final notes section', () => {
    render(<ReviewSection />)

    expect(screen.getByText('Final Notes & Observations')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/additional observations/i)).toBeInTheDocument()
  })

  it('renders Submit Survey button when online', () => {
    render(<ReviewSection />)

    expect(screen.getByRole('button', { name: /submit survey/i })).toBeInTheDocument()
  })

  it('renders Save for Later button when offline', () => {
    mockIsOnline = false
    render(<ReviewSection />)

    expect(screen.getByRole('button', { name: /save for later/i })).toBeInTheDocument()
  })

  it('shows offline warning when offline', () => {
    mockIsOnline = false
    render(<ReviewSection />)

    expect(screen.getByText("You're offline")).toBeInTheDocument()
    expect(screen.getByText(/will be saved locally/)).toBeInTheDocument()
  })

  it('renders Save Draft button when online', () => {
    render(<ReviewSection />)

    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument()
  })

  it('disables submit when validation fails', () => {
    mockValidateAll.mockReturnValue(false)
    render(<ReviewSection />)

    expect(screen.getByRole('button', { name: /submit survey/i })).toBeDisabled()
  })

  it('shows validation warning when not complete', () => {
    mockValidateAll.mockReturnValue(false)
    render(<ReviewSection />)

    expect(screen.getByText(/Complete all required sections/)).toBeInTheDocument()
  })

  it('renders upload status', () => {
    render(<ReviewSection />)

    expect(screen.getByTestId('upload-status')).toBeInTheDocument()
  })

  it('renders voice note button', () => {
    render(<ReviewSection />)

    expect(screen.getByTestId('voice-note')).toBeInTheDocument()
  })
})
