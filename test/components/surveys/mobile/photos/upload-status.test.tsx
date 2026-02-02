import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UploadStatus, UploadStatusCompact } from '@/components/surveys/mobile/photos/upload-status'

// Mock hooks and services
let mockIsOnline = true
let mockStatus = { total: 0, uploaded: 0, pending: 0, failed: 0, progress: 100 }

vi.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockIsOnline,
}))

vi.mock('@/lib/stores/photo-queue-store', () => ({
  usePhotoQueueStore: () => ({
    retryFailed: vi.fn(),
  }),
}))

vi.mock('@/lib/services/photo-upload-service', () => ({
  processPhotoQueue: vi.fn(),
  getUploadProgress: () => mockStatus,
}))

describe('UploadStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline = true
    mockStatus = { total: 0, uploaded: 0, pending: 0, failed: 0, progress: 100 }
  })

  it('returns null when surveyId is null', () => {
    const { container } = render(<UploadStatus surveyId={null} />)

    expect(container.firstChild).toBeNull()
  })

  it('returns null when no photos', () => {
    const { container } = render(<UploadStatus surveyId="survey-1" />)

    expect(container.firstChild).toBeNull()
  })

  it('shows complete state when all uploaded', () => {
    mockStatus = { total: 5, uploaded: 5, pending: 0, failed: 0, progress: 100 }
    render(<UploadStatus surveyId="survey-1" />)

    expect(screen.getByText(/All/)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/photos uploaded/)).toBeInTheDocument()
  })

  it('shows processing state when pending uploads', () => {
    mockStatus = { total: 5, uploaded: 3, pending: 2, failed: 0, progress: 60 }
    render(<UploadStatus surveyId="survey-1" />)

    expect(screen.getByText(/Uploading/)).toBeInTheDocument()
  })

  it('shows failure state when uploads failed', () => {
    mockStatus = { total: 5, uploaded: 3, pending: 0, failed: 2, progress: 60 }
    render(<UploadStatus surveyId="survey-1" />)

    expect(screen.getByText(/failed to upload/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows singular text for one failed photo', () => {
    mockStatus = { total: 5, uploaded: 4, pending: 0, failed: 1, progress: 80 }
    render(<UploadStatus surveyId="survey-1" />)

    expect(screen.getByText(/photo failed/)).toBeInTheDocument()
  })

  it('shows offline state when not connected', () => {
    mockIsOnline = false
    mockStatus = { total: 5, uploaded: 0, pending: 5, failed: 0, progress: 0 }
    render(<UploadStatus surveyId="survey-1" />)

    expect(screen.getByText(/waiting for connection/)).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    mockStatus = { total: 5, uploaded: 5, pending: 0, failed: 0, progress: 100 }
    const { container } = render(<UploadStatus surveyId="survey-1" className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('UploadStatusCompact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline = true
    mockStatus = { total: 0, uploaded: 0, pending: 0, failed: 0, progress: 100 }
  })

  it('returns null when surveyId is null', () => {
    const { container } = render(<UploadStatusCompact surveyId={null} />)

    expect(container.firstChild).toBeNull()
  })

  it('returns null when no photos', () => {
    const { container } = render(<UploadStatusCompact surveyId="survey-1" />)

    expect(container.firstChild).toBeNull()
  })

  it('shows upload count when complete', () => {
    mockStatus = { total: 5, uploaded: 5, pending: 0, failed: 0, progress: 100 }
    render(<UploadStatusCompact surveyId="survey-1" />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows pending count when processing', () => {
    mockStatus = { total: 5, uploaded: 3, pending: 2, failed: 0, progress: 60 }
    render(<UploadStatusCompact surveyId="survey-1" />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows failed count when failures exist', () => {
    mockStatus = { total: 5, uploaded: 3, pending: 0, failed: 2, progress: 60 }
    render(<UploadStatusCompact surveyId="survey-1" />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows waiting count when offline', () => {
    mockIsOnline = false
    mockStatus = { total: 5, uploaded: 0, pending: 3, failed: 2, progress: 0 }
    render(<UploadStatusCompact surveyId="survey-1" />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
