import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhotosSection } from '@/components/surveys/mobile/sections/photos-section'

// Mock PhotoGallery
vi.mock('@/components/surveys/mobile/photos', () => ({
  PhotoGallery: () => <div data-testid="photo-gallery">Photo Gallery</div>,
}))

// Mock PHOTO_REQUIREMENTS
vi.mock('@/lib/stores/survey-types', () => ({
  PHOTO_REQUIREMENTS: {
    exterior: { required: 2 },
    interior: { required: 0 },
    asbestos_materials: { required: 0 },
    mold_areas: { required: 0 },
    lead_components: { required: 0 },
    utility_access: { required: 0 },
    other: { required: 0 },
  },
}))

// Mock survey store
let mockPhotos: any[] = []

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      photos: {
        photos: mockPhotos,
      },
    },
  }),
}))

describe('PhotosSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPhotos = []
  })

  it('renders section title', () => {
    render(<PhotosSection />)

    expect(screen.getByText('Photo Documentation')).toBeInTheDocument()
  })

  it('renders PhotoGallery', () => {
    render(<PhotosSection />)

    expect(screen.getByTestId('photo-gallery')).toBeInTheDocument()
  })

  it('shows photo count', () => {
    mockPhotos = [
      { id: '1', category: 'exterior' },
      { id: '2', category: 'interior' },
    ]
    render(<PhotosSection />)

    expect(screen.getByText('2 photos captured')).toBeInTheDocument()
  })

  it('shows singular photo text', () => {
    mockPhotos = [{ id: '1', category: 'exterior' }]
    render(<PhotosSection />)

    expect(screen.getByText('1 photo captured')).toBeInTheDocument()
  })

  it('shows 0 photos captured', () => {
    render(<PhotosSection />)

    expect(screen.getByText('0 photos captured')).toBeInTheDocument()
  })

  it('renders photo tips', () => {
    render(<PhotosSection />)

    expect(screen.getByText('Photo Tips')).toBeInTheDocument()
    expect(screen.getByText(/capture all 4 sides/i)).toBeInTheDocument()
    expect(screen.getByText(/close-ups of any hazardous materials/i)).toBeInTheDocument()
    expect(screen.getByText(/utility access points/i)).toBeInTheDocument()
    expect(screen.getByText(/add captions/i)).toBeInTheDocument()
  })

  it('shows warning when exterior photos not met', () => {
    mockPhotos = [{ id: '1', category: 'exterior' }]
    render(<PhotosSection />)

    // Look for warning text about needing more photos
    const warningText = screen.getByText((content) => {
      return content.includes('1') && content.includes('exterior photo')
    })
    expect(warningText).toBeInTheDocument()
  })

  it('shows plural warning when multiple photos needed', () => {
    render(<PhotosSection />)

    // Look for the warning text - it shows "2" and "more exterior photo" parts
    const warningText = screen.getByText((content) => {
      return content.includes('2') && content.includes('exterior photo')
    })
    expect(warningText).toBeInTheDocument()
  })

  it('does not show warning when exterior requirement met', () => {
    mockPhotos = [
      { id: '1', category: 'exterior' },
      { id: '2', category: 'exterior' },
    ]
    render(<PhotosSection />)

    expect(screen.queryByText(/more exterior photo/i)).not.toBeInTheDocument()
  })

  it('shows check icon when all requirements met', () => {
    mockPhotos = [
      { id: '1', category: 'exterior' },
      { id: '2', category: 'exterior' },
    ]
    const { container } = render(<PhotosSection />)

    // CheckCircle2 should be rendered for complete state
    expect(container.querySelector('.text-green-600')).toBeInTheDocument()
  })

  it('shows warning icon when requirements not met', () => {
    mockPhotos = []
    const { container } = render(<PhotosSection />)

    // AlertTriangle should be rendered for incomplete state
    expect(container.querySelector('.text-yellow-600')).toBeInTheDocument()
  })
})
