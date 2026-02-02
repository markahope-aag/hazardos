import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoThumbnail } from '@/components/surveys/mobile/photos/photo-thumbnail'

const mockPhoto = {
  id: 'photo-1',
  category: 'general' as const,
  dataUrl: 'data:image/png;base64,abc123',
  caption: 'Test photo caption',
  gpsCoordinates: {
    latitude: 40.7128,
    longitude: -74.0060,
  },
  timestamp: Date.now(),
}

describe('PhotoThumbnail', () => {
  it('renders photo image when dataUrl exists', () => {
    const onClick = vi.fn()
    render(<PhotoThumbnail photo={mockPhoto} onClick={onClick} />)

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', mockPhoto.dataUrl)
  })

  it('renders image alt text from caption', () => {
    const onClick = vi.fn()
    render(<PhotoThumbnail photo={mockPhoto} onClick={onClick} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Test photo caption')
  })

  it('renders default alt text when no caption', () => {
    const onClick = vi.fn()
    const photoWithoutCaption = { ...mockPhoto, caption: undefined }
    render(<PhotoThumbnail photo={photoWithoutCaption} onClick={onClick} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Survey photo')
  })

  it('shows No image placeholder when no dataUrl', () => {
    const onClick = vi.fn()
    const photoWithoutData = { ...mockPhoto, dataUrl: undefined }
    render(<PhotoThumbnail photo={photoWithoutData} onClick={onClick} />)

    expect(screen.getByText('No image')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows caption overlay when caption exists', () => {
    const onClick = vi.fn()
    render(<PhotoThumbnail photo={mockPhoto} onClick={onClick} />)

    expect(screen.getByText('Test photo caption')).toBeInTheDocument()
  })

  it('does not show caption overlay when no caption', () => {
    const onClick = vi.fn()
    const photoWithoutCaption = { ...mockPhoto, caption: undefined }
    render(<PhotoThumbnail photo={photoWithoutCaption} onClick={onClick} />)

    expect(screen.queryByText('Test photo caption')).not.toBeInTheDocument()
  })

  it('shows GPS indicator when gpsCoordinates exist', () => {
    const onClick = vi.fn()
    render(<PhotoThumbnail photo={mockPhoto} onClick={onClick} />)

    // MapPin icon should be present - find the svg in the GPS indicator container
    const button = screen.getByRole('button')
    const gpsIndicator = button.querySelector('.bg-black\\/50.rounded-full')
    expect(gpsIndicator).toBeInTheDocument()
  })

  it('does not show GPS indicator when no gpsCoordinates', () => {
    const onClick = vi.fn()
    const photoWithoutGps = { ...mockPhoto, gpsCoordinates: undefined }
    render(<PhotoThumbnail photo={photoWithoutGps} onClick={onClick} />)

    // No GPS indicator container
    const button = screen.getByRole('button')
    const gpsIndicator = button.querySelector('.top-1.right-1.bg-black\\/50')
    expect(gpsIndicator).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<PhotoThumbnail photo={mockPhoto} onClick={onClick} />)

    await user.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders as a button element', () => {
    const onClick = vi.fn()
    render(<PhotoThumbnail photo={mockPhoto} onClick={onClick} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has touch-manipulation class for mobile', () => {
    const onClick = vi.fn()
    render(<PhotoThumbnail photo={mockPhoto} onClick={onClick} />)

    expect(screen.getByRole('button')).toHaveClass('touch-manipulation')
  })
})
