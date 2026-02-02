import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HazardsSection } from '@/components/surveys/mobile/sections/hazards-section'

// Mock child components
vi.mock('@/components/surveys/mobile/hazards', () => ({
  HazardTypeSelector: () => <div data-testid="hazard-type-selector">Hazard Type Selector</div>,
  AsbestosForm: () => <div data-testid="asbestos-form">Asbestos Form</div>,
  MoldForm: () => <div data-testid="mold-form">Mold Form</div>,
  LeadForm: () => <div data-testid="lead-form">Lead Form</div>,
  OtherHazardForm: () => <div data-testid="other-hazard-form">Other Hazard Form</div>,
}))

// Mock survey store
let mockHazardTypes: string[] = []

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      hazards: {
        types: mockHazardTypes,
      },
    },
  }),
}))

describe('HazardsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHazardTypes = []
  })

  it('renders section title', () => {
    render(<HazardsSection />)

    expect(screen.getByText('Hazard Types Present')).toBeInTheDocument()
  })

  it('renders HazardTypeSelector', () => {
    render(<HazardsSection />)

    expect(screen.getByTestId('hazard-type-selector')).toBeInTheDocument()
  })

  it('does not show hazard forms when no types selected', () => {
    render(<HazardsSection />)

    expect(screen.queryByTestId('asbestos-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mold-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('lead-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('other-hazard-form')).not.toBeInTheDocument()
  })

  it('shows AsbestosForm when asbestos is selected', () => {
    mockHazardTypes = ['asbestos']
    render(<HazardsSection />)

    expect(screen.getByTestId('asbestos-form')).toBeInTheDocument()
    expect(screen.getByText('Asbestos Details')).toBeInTheDocument()
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('shows MoldForm when mold is selected', () => {
    mockHazardTypes = ['mold']
    render(<HazardsSection />)

    expect(screen.getByTestId('mold-form')).toBeInTheDocument()
    expect(screen.getByText('Mold Details')).toBeInTheDocument()
    expect(screen.getByText('🦠')).toBeInTheDocument()
  })

  it('shows LeadForm when lead is selected', () => {
    mockHazardTypes = ['lead']
    render(<HazardsSection />)

    expect(screen.getByTestId('lead-form')).toBeInTheDocument()
    expect(screen.getByText('Lead Paint Details')).toBeInTheDocument()
    expect(screen.getByText('🎨')).toBeInTheDocument()
  })

  it('shows OtherHazardForm when other is selected', () => {
    mockHazardTypes = ['other']
    render(<HazardsSection />)

    expect(screen.getByTestId('other-hazard-form')).toBeInTheDocument()
    expect(screen.getByText('Other Hazards')).toBeInTheDocument()
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  it('shows multiple forms when multiple types selected', () => {
    mockHazardTypes = ['asbestos', 'mold', 'lead', 'other']
    render(<HazardsSection />)

    expect(screen.getByTestId('asbestos-form')).toBeInTheDocument()
    expect(screen.getByTestId('mold-form')).toBeInTheDocument()
    expect(screen.getByTestId('lead-form')).toBeInTheDocument()
    expect(screen.getByTestId('other-hazard-form')).toBeInTheDocument()
  })

  it('shows divider border when hazards are selected', () => {
    mockHazardTypes = ['asbestos']
    const { container } = render(<HazardsSection />)

    const divider = container.querySelector('.border-t')
    expect(divider).toBeInTheDocument()
  })

  it('does not show divider when no hazards selected', () => {
    const { container } = render(<HazardsSection />)

    const divider = container.querySelector('.border-t')
    expect(divider).not.toBeInTheDocument()
  })
})
