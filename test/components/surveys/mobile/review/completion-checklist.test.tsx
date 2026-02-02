import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompletionChecklist } from '@/components/surveys/mobile/review/completion-checklist'

// Mock survey store
const mockSetCurrentSection = vi.fn()
const mockValidateSection = vi.fn()

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    validateSection: mockValidateSection,
    setCurrentSection: mockSetCurrentSection,
  }),
}))

vi.mock('@/lib/stores/survey-types', () => ({
  SECTION_LABELS: {
    property: 'Property Information',
    access: 'Access & Parking',
    environment: 'Environment',
    hazards: 'Hazards',
    photos: 'Photos',
  },
}))

describe('CompletionChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateSection.mockReturnValue({ isValid: true, errors: [] })
  })

  it('renders progress summary', () => {
    render(<CompletionChecklist />)

    expect(screen.getByText(/of 5 sections complete/)).toBeInTheDocument()
  })

  it('shows Ready to Submit when all complete', () => {
    render(<CompletionChecklist />)

    expect(screen.getByText('Ready to Submit')).toBeInTheDocument()
    expect(screen.getByText('5 of 5 sections complete')).toBeInTheDocument()
  })

  it('shows Survey Incomplete when not all complete', () => {
    mockValidateSection.mockImplementation((section) => {
      if (section === 'property') return { isValid: false, errors: ['Address is required'] }
      return { isValid: true, errors: [] }
    })
    render(<CompletionChecklist />)

    expect(screen.getByText('Survey Incomplete')).toBeInTheDocument()
    expect(screen.getByText('4 of 5 sections complete')).toBeInTheDocument()
  })

  it('renders section buttons', () => {
    render(<CompletionChecklist />)

    expect(screen.getByText('Property Information')).toBeInTheDocument()
    expect(screen.getByText('Access & Parking')).toBeInTheDocument()
    expect(screen.getByText('Environment')).toBeInTheDocument()
    expect(screen.getByText('Hazards')).toBeInTheDocument()
    expect(screen.getByText('Photos')).toBeInTheDocument()
  })

  it('shows Tap to edit on section buttons', () => {
    render(<CompletionChecklist />)

    const tapTexts = screen.getAllByText('Tap to edit')
    expect(tapTexts).toHaveLength(5)
  })

  it('shows validation errors for incomplete sections', () => {
    mockValidateSection.mockImplementation((section) => {
      if (section === 'property') {
        return { isValid: false, errors: ['Address is required', 'City is required'] }
      }
      return { isValid: true, errors: [] }
    })
    render(<CompletionChecklist />)

    expect(screen.getByText('• Address is required')).toBeInTheDocument()
    expect(screen.getByText('• City is required')).toBeInTheDocument()
  })

  it('calls setCurrentSection when section clicked', async () => {
    const user = userEvent.setup()
    render(<CompletionChecklist />)

    await user.click(screen.getByText('Property Information'))

    expect(mockSetCurrentSection).toHaveBeenCalledWith('property')
  })

  it('calls setCurrentSection with correct section', async () => {
    const user = userEvent.setup()
    render(<CompletionChecklist />)

    await user.click(screen.getByText('Hazards'))

    expect(mockSetCurrentSection).toHaveBeenCalledWith('hazards')
  })
})
