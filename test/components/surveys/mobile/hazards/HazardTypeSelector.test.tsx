import { render, screen, fireEvent } from '@testing-library/react'
import { HazardTypeSelector } from '@/components/surveys/mobile/hazards/HazardTypeSelector'

// Mock the survey store
const mockUseSurveyStore = {
  formData: {
    hazards: {
      types: [] as string[],
    },
  },
  toggleHazardType: vi.fn(),
}

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => mockUseSurveyStore,
}))

// Mock survey types
vi.mock('@/lib/stores/survey-types', () => ({
  HazardType: {
    ASBESTOS: 'asbestos',
    MOLD: 'mold', 
    LEAD: 'lead',
    OTHER: 'other',
  },
}))

describe('HazardTypeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSurveyStore.formData.hazards.types = []
  })

  it('should render all hazard type options', () => {
    render(<HazardTypeSelector />)
    
    expect(screen.getByText('ASBESTOS')).toBeInTheDocument()
    expect(screen.getByText('MOLD')).toBeInTheDocument()
    expect(screen.getByText('LEAD PAINT')).toBeInTheDocument()
    expect(screen.getByText('OTHER')).toBeInTheDocument()
  })

  it('should display hazard descriptions', () => {
    render(<HazardTypeSelector />)
    
    expect(screen.getByText('Pipe insulation, ceiling tiles, floor tiles, vermiculite, siding, roofing')).toBeInTheDocument()
    expect(screen.getByText('Visible growth, water damage, musty odors')).toBeInTheDocument()
    expect(screen.getByText('Pre-1978 buildings, deteriorating paint')).toBeInTheDocument()
    expect(screen.getByText('PCBs, mercury, silica, other regulated materials')).toBeInTheDocument()
  })

  it('should display hazard emojis', () => {
    render(<HazardTypeSelector />)
    
    expect(screen.getByText('⚠️')).toBeInTheDocument()
    expect(screen.getByText('🦠')).toBeInTheDocument()
    expect(screen.getByText('🎨')).toBeInTheDocument()
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  it('should show instruction text', () => {
    render(<HazardTypeSelector />)
    
    expect(screen.getByText('Select all hazard types identified at this property')).toBeInTheDocument()
  })

  it('should show empty state message when no types selected', () => {
    render(<HazardTypeSelector />)
    
    expect(screen.getByText('Tap a hazard type to begin documenting')).toBeInTheDocument()
  })

  it('should hide empty state message when types are selected', () => {
    mockUseSurveyStore.formData.hazards.types = ['asbestos']
    render(<HazardTypeSelector />)
    
    expect(screen.queryByText('Tap a hazard type to begin documenting')).not.toBeInTheDocument()
  })

  it('should call toggleHazardType when option is clicked', () => {
    render(<HazardTypeSelector />)
    
    const asbestosButton = screen.getByRole('button', { name: /asbestos/i })
    fireEvent.click(asbestosButton)
    
    expect(mockUseSurveyStore.toggleHazardType).toHaveBeenCalledWith('asbestos')
  })

  it('should show selected state for chosen hazard types', () => {
    mockUseSurveyStore.formData.hazards.types = ['asbestos', 'mold']
    render(<HazardTypeSelector />)
    
    const asbestosButton = screen.getByRole('button', { name: /asbestos/i })
    const moldButton = screen.getByRole('button', { name: /mold/i })
    const leadButton = screen.getByRole('button', { name: /lead paint/i })
    
    // Selected buttons should have colored backgrounds
    expect(asbestosButton).toHaveClass('bg-orange-50', 'border-orange-500')
    expect(moldButton).toHaveClass('bg-green-50', 'border-green-500')
    
    // Unselected button should have default styling
    expect(leadButton).toHaveClass('bg-background', 'border-border')
  })

  it('should show check marks for selected options', () => {
    mockUseSurveyStore.formData.hazards.types = ['asbestos']
    render(<HazardTypeSelector />)
    
    const asbestosButton = screen.getByRole('button', { name: /asbestos/i })
    const checkIcon = asbestosButton.querySelector('.lucide-check')
    expect(checkIcon).toBeInTheDocument()
    expect(checkIcon).toHaveClass('text-orange-700')
  })

  it('should not show check marks for unselected options', () => {
    render(<HazardTypeSelector />)
    
    const moldButton = screen.getByRole('button', { name: /mold/i })
    const checkIcon = moldButton.querySelector('.lucide-check')
    expect(checkIcon).not.toBeInTheDocument()
  })

  it('should apply correct color schemes for each hazard type', () => {
    mockUseSurveyStore.formData.hazards.types = ['asbestos', 'mold', 'lead', 'other']
    render(<HazardTypeSelector />)
    
    // Asbestos - orange theme
    const asbestosButton = screen.getByRole('button', { name: /asbestos/i })
    expect(asbestosButton).toHaveClass('bg-orange-50', 'border-orange-500')
    const asbestosText = asbestosButton.querySelector('.font-bold')
    expect(asbestosText).toHaveClass('text-orange-700')
    
    // Mold - green theme
    const moldButton = screen.getByRole('button', { name: /mold/i })
    expect(moldButton).toHaveClass('bg-green-50', 'border-green-500')
    const moldText = moldButton.querySelector('.font-bold')
    expect(moldText).toHaveClass('text-green-700')
    
    // Lead - blue theme
    const leadButton = screen.getByRole('button', { name: /lead paint/i })
    expect(leadButton).toHaveClass('bg-blue-50', 'border-blue-500')
    const leadText = leadButton.querySelector('.font-bold')
    expect(leadText).toHaveClass('text-blue-700')
    
    // Other - purple theme
    const otherButton = screen.getByRole('button', { name: /other/i })
    expect(otherButton).toHaveClass('bg-purple-50', 'border-purple-500')
    const otherText = otherButton.querySelector('.font-bold')
    expect(otherText).toHaveClass('text-purple-700')
  })

  it('should handle multiple selections', () => {
    const { rerender } = render(<HazardTypeSelector />)
    
    // Initially no selections
    expect(screen.getByText('Tap a hazard type to begin documenting')).toBeInTheDocument()
    
    // Select asbestos
    mockUseSurveyStore.formData.hazards.types = ['asbestos']
    rerender(<HazardTypeSelector />)
    expect(screen.queryByText('Tap a hazard type to begin documenting')).not.toBeInTheDocument()
    
    // Select multiple types
    mockUseSurveyStore.formData.hazards.types = ['asbestos', 'mold', 'lead']
    rerender(<HazardTypeSelector />)
    
    const selectedButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('.lucide-check')
    )
    expect(selectedButtons).toHaveLength(3)
  })

  it('should apply custom className', () => {
    render(<HazardTypeSelector className="custom-selector-class" />)
    
    const container = screen.getByText('Select all hazard types identified at this property').parentElement
    expect(container).toHaveClass('custom-selector-class')
  })

  it('should have proper button accessibility', () => {
    render(<HazardTypeSelector />)
    
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  it('should handle rapid clicking without errors', () => {
    render(<HazardTypeSelector />)
    
    const asbestosButton = screen.getByRole('button', { name: /asbestos/i })
    
    // Click multiple times rapidly
    fireEvent.click(asbestosButton)
    fireEvent.click(asbestosButton)
    fireEvent.click(asbestosButton)
    
    expect(mockUseSurveyStore.toggleHazardType).toHaveBeenCalledTimes(3)
    expect(mockUseSurveyStore.toggleHazardType).toHaveBeenCalledWith('asbestos')
  })

  it('should maintain layout with long descriptions', () => {
    render(<HazardTypeSelector />)
    
    // All description texts should be present and properly clipped
    const descriptions = screen.getAllByText(/pipe insulation|visible growth|pre-1978|pcbs/i)
    expect(descriptions).toHaveLength(4)
    
    descriptions.forEach(desc => {
      expect(desc).toHaveClass('line-clamp-2')
    })
  })
})