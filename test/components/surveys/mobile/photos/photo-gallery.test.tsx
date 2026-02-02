import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGallery } from '@/components/surveys/mobile/photos/photo-gallery'
import { PhotoData } from '@/lib/stores/survey-types'

// Mock child components
vi.mock('@/components/surveys/mobile/photos/photo-category-group', () => ({
  PhotoCategoryGroup: ({ category, photos, onPhotoClick }: any) => (
    <div data-testid={`category-${category}`}>
      {photos.map((photo: any) => (
        <button
          key={photo.id}
          data-testid={`photo-${photo.id}`}
          onClick={() => onPhotoClick(photo)}
        >
          {photo.caption}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/surveys/mobile/photos/photo-detail', () => ({
  PhotoDetail: ({ photo, open, onClose }: any) => (
    open ? (
      <div data-testid="photo-detail">
        <span>{photo?.caption}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}))

// Mock survey store
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
    category: 'interior',
    dataUrl: 'data:image/png;base64,2',
    caption: 'Living room',
    timestamp: Date.now(),
  },
  {
    id: 'photo-3',
    category: 'exterior',
    dataUrl: 'data:image/png;base64,3',
    caption: 'Back yard',
    timestamp: Date.now(),
  },
]

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      photos: {
        photos: mockPhotos,
      },
    },
  }),
}))

describe('PhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all category groups', () => {
    render(<PhotoGallery />)

    expect(screen.getByTestId('category-exterior')).toBeInTheDocument()
    expect(screen.getByTestId('category-interior')).toBeInTheDocument()
    expect(screen.getByTestId('category-asbestos_materials')).toBeInTheDocument()
    expect(screen.getByTestId('category-mold_areas')).toBeInTheDocument()
    expect(screen.getByTestId('category-lead_components')).toBeInTheDocument()
    expect(screen.getByTestId('category-utility_access')).toBeInTheDocument()
    expect(screen.getByTestId('category-other')).toBeInTheDocument()
  })

  it('groups photos by category', () => {
    render(<PhotoGallery />)

    // Exterior should have 2 photos
    const exteriorGroup = screen.getByTestId('category-exterior')
    expect(exteriorGroup).toContainElement(screen.getByText('Front view'))
    expect(exteriorGroup).toContainElement(screen.getByText('Back yard'))

    // Interior should have 1 photo
    const interiorGroup = screen.getByTestId('category-interior')
    expect(interiorGroup).toContainElement(screen.getByText('Living room'))
  })

  it('shows photo detail when photo is clicked', async () => {
    const user = userEvent.setup()
    render(<PhotoGallery />)

    // Click on a photo
    await user.click(screen.getByTestId('photo-photo-1'))

    // Detail should be shown
    expect(screen.getByTestId('photo-detail')).toBeInTheDocument()
    // Caption appears both in button and detail, so use within
    const detail = screen.getByTestId('photo-detail')
    expect(detail).toHaveTextContent('Front view')
  })

  it('closes photo detail when close is clicked', async () => {
    const user = userEvent.setup()
    render(<PhotoGallery />)

    // Open detail
    await user.click(screen.getByTestId('photo-photo-1'))
    expect(screen.getByTestId('photo-detail')).toBeInTheDocument()

    // Close detail
    await user.click(screen.getByText('Close'))
    expect(screen.queryByTestId('photo-detail')).not.toBeInTheDocument()
  })

  it('does not show photo detail initially', () => {
    render(<PhotoGallery />)

    expect(screen.queryByTestId('photo-detail')).not.toBeInTheDocument()
  })
})
