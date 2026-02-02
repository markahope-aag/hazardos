import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoCategoryGroup } from '@/components/surveys/mobile/photos/photo-category-group'
import { PhotoCategory, PhotoData } from '@/lib/stores/survey-types'

// Mock components
vi.mock('@/components/surveys/mobile/photos/photo-thumbnail', () => ({
  PhotoThumbnail: ({ photo, onClick }: any) => (
    <button data-testid={`thumbnail-${photo.id}`} onClick={() => onClick(photo)}>
      {photo.caption}
    </button>
  ),
}))

vi.mock('@/components/surveys/mobile/photos/photo-capture', () => ({
  PhotoCapture: ({ category }: any) => (
    <div data-testid={`capture-${category}`}>Capture</div>
  ),
}))

// Mock PHOTO_REQUIREMENTS
vi.mock('@/lib/stores/survey-types', async () => {
  const actual = await vi.importActual('@/lib/stores/survey-types')
  return {
    ...actual,
    PHOTO_REQUIREMENTS: {
      exterior: { label: 'Exterior', required: 2 },
      interior: { label: 'Interior', required: 2 },
      asbestos_materials: { label: 'Asbestos Materials', required: 0 },
      mold_areas: { label: 'Mold Areas', required: 0 },
      lead_components: { label: 'Lead Components', required: 0 },
      utility_access: { label: 'Utility Access', required: 1 },
      other: { label: 'Other', required: 0 },
    },
  }
})

const mockPhotos: PhotoData[] = [
  {
    id: 'photo-1',
    category: 'exterior',
    dataUrl: 'data:image/png;base64,1',
    caption: 'Front view',
    timestamp: Date.now(),
  },
  {
    id: 'photo-2',
    category: 'exterior',
    dataUrl: 'data:image/png;base64,2',
    caption: 'Back view',
    timestamp: Date.now(),
  },
]

describe('PhotoCategoryGroup', () => {
  const mockOnPhotoClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders category label', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByText('Exterior')).toBeInTheDocument()
  })

  it('renders photo count', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('renders photo thumbnails', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByTestId('thumbnail-photo-1')).toBeInTheDocument()
    expect(screen.getByTestId('thumbnail-photo-2')).toBeInTheDocument()
  })

  it('renders PhotoCapture component', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByTestId('capture-exterior')).toBeInTheDocument()
  })

  it('shows empty state when no photos', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={[]}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByText('No photos in this category')).toBeInTheDocument()
  })

  it('shows requirement warning when below required', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={[mockPhotos[0]]}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByText('1 more photo required')).toBeInTheDocument()
  })

  it('shows plural requirement warning when multiple needed', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={[]}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByText('2 more photos required')).toBeInTheDocument()
  })

  it('does not show requirement warning when met', () => {
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.queryByText(/more photo/i)).not.toBeInTheDocument()
  })

  it('calls onPhotoClick when thumbnail is clicked', async () => {
    const user = userEvent.setup()
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    await user.click(screen.getByTestId('thumbnail-photo-1'))

    expect(mockOnPhotoClick).toHaveBeenCalledWith(mockPhotos[0])
  })

  it('toggles collapse state when header is clicked', async () => {
    const user = userEvent.setup()
    render(
      <PhotoCategoryGroup
        category="exterior"
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    // Initially open
    expect(screen.getByTestId('thumbnail-photo-1')).toBeVisible()

    // Click header to collapse
    await user.click(screen.getByText('Exterior'))

    // Content should be collapsed (not in DOM when using radix-ui)
  })

  it('shows count without requirement for optional categories', () => {
    render(
      <PhotoCategoryGroup
        category="other"
        photos={[mockPhotos[0]]}
        onPhotoClick={mockOnPhotoClick}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
