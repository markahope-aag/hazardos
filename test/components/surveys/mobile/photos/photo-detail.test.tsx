import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoDetail } from '@/components/surveys/mobile/photos/photo-detail'
import type { PhotoData } from '@/lib/stores/survey-types'

// Mock survey store
const mockUpdatePhoto = vi.fn()
const mockRemovePhoto = vi.fn()

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    updatePhoto: mockUpdatePhoto,
    removePhoto: mockRemovePhoto,
  }),
}))

// Mock PHOTO_REQUIREMENTS
vi.mock('@/lib/stores/survey-types', () => ({
  PHOTO_REQUIREMENTS: {
    exterior: { label: 'Exterior', required: 2 },
    interior: { label: 'Interior', required: 0 },
    asbestos_materials: { label: 'Asbestos Materials', required: 0 },
    mold_areas: { label: 'Mold Areas', required: 0 },
    lead_components: { label: 'Lead Components', required: 0 },
    utility_access: { label: 'Utility Access', required: 0 },
    other: { label: 'Other', required: 0 },
  },
}))

const mockPhoto: PhotoData = {
  id: 'photo-1',
  category: 'exterior',
  dataUrl: 'data:image/png;base64,test',
  caption: 'Front view',
  location: 'Main entrance',
  timestamp: Date.now(),
  gpsCoordinates: {
    latitude: 40.7128,
    longitude: -74.006,
  },
}

describe('PhotoDetail', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when photo is null', () => {
    const { container } = render(
      <PhotoDetail photo={null} open={true} onClose={mockOnClose} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders dialog title', () => {
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Photo Details')).toBeInTheDocument()
  })

  it('renders photo image', () => {
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    const img = screen.getByAltText('Front view')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', mockPhoto.dataUrl)
  })

  it('shows No image available when no dataUrl', () => {
    const photoNoImage = { ...mockPhoto, dataUrl: '' }
    render(<PhotoDetail photo={photoNoImage} open={true} onClose={mockOnClose} />)

    expect(screen.getByText('No image available')).toBeInTheDocument()
  })

  it('renders GPS coordinates', () => {
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    expect(screen.getByText(/40.712800, -74.006000/)).toBeInTheDocument()
  })

  it('renders Category field', () => {
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('renders Location field', () => {
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Main entrance')).toBeInTheDocument()
  })

  it('renders Caption field', () => {
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    expect(screen.getByText('Caption')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Front view')).toBeInTheDocument()
  })

  it('renders Delete Photo button', () => {
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    expect(screen.getByRole('button', { name: /delete photo/i })).toBeInTheDocument()
  })

  it('calls updatePhoto when location changes', async () => {
    const user = userEvent.setup()
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    const locationInput = screen.getByDisplayValue('Main entrance')
    await user.type(locationInput, 'x')

    expect(mockUpdatePhoto).toHaveBeenCalled()
  })

  it('calls updatePhoto when caption changes', async () => {
    const user = userEvent.setup()
    render(<PhotoDetail photo={mockPhoto} open={true} onClose={mockOnClose} />)

    const captionInput = screen.getByDisplayValue('Front view')
    await user.type(captionInput, 'x')

    expect(mockUpdatePhoto).toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    render(<PhotoDetail photo={mockPhoto} open={false} onClose={mockOnClose} />)

    expect(screen.queryByText('Photo Details')).not.toBeInTheDocument()
  })
})
