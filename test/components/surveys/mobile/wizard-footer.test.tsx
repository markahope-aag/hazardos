import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WizardFooter } from '@/components/surveys/mobile/wizard-footer'

// Mock survey store
const mockSetCurrentSection = vi.fn()
const mockValidateSection = vi.fn()
const mockValidateAll = vi.fn()

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    currentSection: 'property',
    setCurrentSection: mockSetCurrentSection,
    validateSection: mockValidateSection,
    validateAll: mockValidateAll,
  }),
}))

// Mock the SURVEY_SECTIONS
vi.mock('@/lib/stores/survey-types', () => ({
  SURVEY_SECTIONS: ['property', 'hazards', 'photos', 'review'],
}))

describe('WizardFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateSection.mockReturnValue({ isValid: true, errors: [] })
    mockValidateAll.mockReturnValue(true)
  })

  it('renders Back and Next buttons', () => {
    render(<WizardFooter />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('disables Back button on first section', () => {
    render(<WizardFooter />)

    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).toBeDisabled()
  })

  it('calls setCurrentSection on Next click', async () => {
    const user = userEvent.setup()
    render(<WizardFooter />)

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(mockSetCurrentSection).toHaveBeenCalledWith('hazards')
  })

  it('accepts custom className', () => {
    const { container } = render(<WizardFooter className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has fixed positioning styles', () => {
    const { container } = render(<WizardFooter />)

    expect(container.firstChild).toHaveClass('fixed', 'bottom-0')
  })
})

// Note: Testing different section states requires creating separate mock modules,
// which is complex in vitest. The tests above cover the default 'property' section.
// For full coverage, you would need separate test files or use different mocking strategies.
