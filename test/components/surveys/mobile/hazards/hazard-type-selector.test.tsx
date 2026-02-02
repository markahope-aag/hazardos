import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HazardTypeSelector } from '@/components/surveys/mobile/hazards/hazard-type-selector'

// Mock survey store
const mockToggleHazardType = vi.fn()
let mockSelectedTypes: string[] = []

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      hazards: {
        types: mockSelectedTypes,
      },
    },
    toggleHazardType: mockToggleHazardType,
  }),
}))

describe('HazardTypeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedTypes = []
  })

  it('renders all hazard type options', () => {
    render(<HazardTypeSelector />)

    expect(screen.getByText('ASBESTOS')).toBeInTheDocument()
    expect(screen.getByText('MOLD')).toBeInTheDocument()
    expect(screen.getByText('LEAD PAINT')).toBeInTheDocument()
    expect(screen.getByText('OTHER')).toBeInTheDocument()
  })

  it('renders hazard descriptions', () => {
    render(<HazardTypeSelector />)

    expect(screen.getByText(/pipe insulation/i)).toBeInTheDocument()
    expect(screen.getByText(/visible growth/i)).toBeInTheDocument()
    expect(screen.getByText(/pre-1978 buildings/i)).toBeInTheDocument()
    expect(screen.getByText(/pcbs/i)).toBeInTheDocument()
  })

  it('renders hazard emojis', () => {
    render(<HazardTypeSelector />)

    expect(screen.getByText('⚠️')).toBeInTheDocument()
    expect(screen.getByText('🦠')).toBeInTheDocument()
    expect(screen.getByText('🎨')).toBeInTheDocument()
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  it('renders instruction text', () => {
    render(<HazardTypeSelector />)

    expect(screen.getByText(/select all hazard types/i)).toBeInTheDocument()
  })

  it('shows tap instruction when no hazards selected', () => {
    render(<HazardTypeSelector />)

    expect(screen.getByText(/tap a hazard type to begin/i)).toBeInTheDocument()
  })

  it('calls toggleHazardType when option is clicked', async () => {
    const user = userEvent.setup()
    render(<HazardTypeSelector />)

    await user.click(screen.getByText('ASBESTOS'))

    expect(mockToggleHazardType).toHaveBeenCalledWith('asbestos')
  })

  it('calls toggleHazardType with mold when MOLD clicked', async () => {
    const user = userEvent.setup()
    render(<HazardTypeSelector />)

    await user.click(screen.getByText('MOLD'))

    expect(mockToggleHazardType).toHaveBeenCalledWith('mold')
  })

  it('calls toggleHazardType with lead when LEAD PAINT clicked', async () => {
    const user = userEvent.setup()
    render(<HazardTypeSelector />)

    await user.click(screen.getByText('LEAD PAINT'))

    expect(mockToggleHazardType).toHaveBeenCalledWith('lead')
  })

  it('calls toggleHazardType with other when OTHER clicked', async () => {
    const user = userEvent.setup()
    render(<HazardTypeSelector />)

    await user.click(screen.getByText('OTHER'))

    expect(mockToggleHazardType).toHaveBeenCalledWith('other')
  })

  it('accepts custom className', () => {
    const { container } = render(<HazardTypeSelector className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows check mark when hazard is selected', () => {
    mockSelectedTypes = ['asbestos']
    render(<HazardTypeSelector />)

    // The Check component should be rendered - find it by the svg element
    const asbestosButton = screen.getByText('ASBESTOS').closest('button')
    expect(asbestosButton?.querySelector('svg')).toBeInTheDocument()
  })

  it('does not show tap instruction when hazards are selected', () => {
    mockSelectedTypes = ['asbestos']
    render(<HazardTypeSelector />)

    expect(screen.queryByText(/tap a hazard type to begin/i)).not.toBeInTheDocument()
  })

  it('renders options as buttons', () => {
    render(<HazardTypeSelector />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
  })
})
