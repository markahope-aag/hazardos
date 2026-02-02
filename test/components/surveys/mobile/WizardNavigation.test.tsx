import { render, screen, fireEvent } from '@testing-library/react'
import { WizardNavigation, WizardNavigationLabel } from '@/components/surveys/mobile/WizardNavigation'

// Mock the survey store
const mockUseSurveyStore = {
  currentSection: 'property' as const,
  setCurrentSection: vi.fn(),
  sectionValidation: {
    property: { isValid: true },
    environment: { isValid: false },
    access: { isValid: false },
    hazards: { isValid: true },
    review: { isValid: false },
  },
}

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => mockUseSurveyStore,
}))

// Mock the survey types
vi.mock('@/lib/stores/survey-types', () => ({
  SURVEY_SECTIONS: ['property', 'environment', 'access', 'hazards', 'review'],
  SECTION_LABELS: {
    property: 'Property Information',
    environment: 'Environmental Conditions',
    access: 'Access & Safety',
    hazards: 'Hazard Assessment',
    review: 'Review & Submit',
  },
}))

describe('WizardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSurveyStore.currentSection = 'property'
    mockUseSurveyStore.sectionValidation = {
      property: { isValid: true },
      environment: { isValid: false },
      access: { isValid: false },
      hazards: { isValid: true },
      review: { isValid: false },
    }
  })

  it('should render all navigation steps', () => {
    render(<WizardNavigation />)
    
    // Should render 5 navigation buttons
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('should highlight current section', () => {
    render(<WizardNavigation />)
    
    const currentButton = screen.getByRole('button', { 
      name: /go to property information section/i 
    })
    expect(currentButton).toHaveClass('ring-2', 'ring-primary', 'ring-offset-2')
    expect(currentButton).toHaveAttribute('aria-current', 'step')
  })

  it('should show completed sections with check marks', () => {
    mockUseSurveyStore.currentSection = 'environment'
    render(<WizardNavigation />)
    
    // Property section should be completed (has check mark)
    const propertyButton = screen.getByRole('button', { 
      name: /go to property information section/i 
    })
    expect(propertyButton.querySelector('.lucide-check')).toBeInTheDocument()
  })

  it('should call setCurrentSection when navigation button is clicked', () => {
    render(<WizardNavigation />)
    
    const environmentButton = screen.getByRole('button', { 
      name: /go to environmental conditions section/i 
    })
    fireEvent.click(environmentButton)
    
    expect(mockUseSurveyStore.setCurrentSection).toHaveBeenCalledWith('environment')
  })

  it('should apply different styles for past, current, and future sections', () => {
    mockUseSurveyStore.currentSection = 'access'
    render(<WizardNavigation />)
    
    const buttons = screen.getAllByRole('button')
    
    // Should render all buttons
    expect(buttons).toHaveLength(5)
    
    // Current section should have ring styling
    const currentButton = screen.getByRole('button', { 
      name: /go to access & safety section/i 
    })
    expect(currentButton).toHaveClass('ring-2', 'ring-primary', 'ring-offset-2')
    
    // Completed sections should show check marks
    const completedButton = screen.getByRole('button', { 
      name: /go to property information section/i 
    })
    expect(completedButton.querySelector('.lucide-check')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<WizardNavigation />)
    
    const buttons = screen.getAllByRole('button')
    
    buttons.forEach((button, index) => {
      const sectionNames = [
        'Property Information',
        'Environmental Conditions', 
        'Access & Safety',
        'Hazard Assessment',
        'Review & Submit'
      ]
      
      expect(button).toHaveAttribute('aria-label', `Go to ${sectionNames[index]} section`)
    })
    
    // Current section should have aria-current
    const currentButton = screen.getByRole('button', { 
      name: /go to property information section/i 
    })
    expect(currentButton).toHaveAttribute('aria-current', 'step')
  })

  it('should apply custom className', () => {
    render(<WizardNavigation className="custom-class" />)
    
    const container = screen.getAllByRole('button')[0].parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should handle all sections being invalid', () => {
    mockUseSurveyStore.sectionValidation = {
      property: { isValid: false },
      environment: { isValid: false },
      access: { isValid: false },
      hazards: { isValid: false },
      review: { isValid: false },
    }
    
    render(<WizardNavigation />)
    
    // Should still render without errors
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('should handle all sections being valid', () => {
    mockUseSurveyStore.currentSection = 'review'
    mockUseSurveyStore.sectionValidation = {
      property: { isValid: true },
      environment: { isValid: true },
      access: { isValid: true },
      hazards: { isValid: true },
      review: { isValid: false },
    }
    
    render(<WizardNavigation />)
    
    // First 4 sections should show check marks
    const buttons = screen.getAllByRole('button')
    expect(buttons[0].querySelector('.lucide-check')).toBeInTheDocument()
    expect(buttons[1].querySelector('.lucide-check')).toBeInTheDocument()
    expect(buttons[2].querySelector('.lucide-check')).toBeInTheDocument()
    expect(buttons[3].querySelector('.lucide-check')).toBeInTheDocument()
  })
})

describe('WizardNavigationLabel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSurveyStore.currentSection = 'property'
  })

  it('should display current step number and total', () => {
    render(<WizardNavigationLabel />)
    
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
  })

  it('should display current section label', () => {
    render(<WizardNavigationLabel />)
    
    expect(screen.getByText('Property Information')).toBeInTheDocument()
  })

  it('should update when current section changes', () => {
    const { rerender } = render(<WizardNavigationLabel />)
    
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('Property Information')).toBeInTheDocument()
    
    mockUseSurveyStore.currentSection = 'hazards'
    rerender(<WizardNavigationLabel />)
    
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument()
    expect(screen.getByText('Hazard Assessment')).toBeInTheDocument()
  })

  it('should handle last section', () => {
    mockUseSurveyStore.currentSection = 'review'
    render(<WizardNavigationLabel />)
    
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument()
    expect(screen.getByText('Review & Submit')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<WizardNavigationLabel className="custom-label-class" />)
    
    const container = screen.getByText('Step 1 of 5').parentElement
    expect(container).toHaveClass('custom-label-class')
  })

  it('should have proper text styling', () => {
    render(<WizardNavigationLabel />)
    
    const stepText = screen.getByText('Step 1 of 5')
    expect(stepText).toHaveClass('text-sm', 'text-muted-foreground')
    
    const titleText = screen.getByText('Property Information')
    expect(titleText).toHaveClass('text-lg', 'font-semibold', 'text-foreground')
  })
})