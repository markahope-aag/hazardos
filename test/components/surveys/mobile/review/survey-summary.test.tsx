import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SurveySummary } from '@/components/surveys/mobile/review/survey-summary'

// Mock survey store
let mockFormData: any = {
  property: {
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    buildingType: 'commercial_office',
    yearBuilt: 1970,
    squareFootage: 5000,
    stories: 2,
    ownerName: 'John Smith',
  },
  access: {
    hasRestrictions: true,
    restrictions: ['locked_areas', 'height_access'],
  },
  environment: {
    temperature: 72,
    humidity: 45,
  },
  hazards: {
    types: ['asbestos', 'mold'],
    asbestos: {
      materials: [{ id: '1' }, { id: '2' }],
    },
    mold: {
      affectedAreas: [
        { id: '1', squareFootage: 50 },
        { id: '2', squareFootage: 30 },
      ],
      hvacContaminated: false,
    },
    lead: null,
    other: null,
  },
  photos: {
    photos: [
      { id: '1', category: 'exterior' },
      { id: '2', category: 'exterior' },
      { id: '3', category: 'interior' },
    ],
  },
}
let mockStartedAt = Date.now()

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: mockFormData,
    startedAt: mockStartedAt,
  }),
}))

vi.mock('@/lib/stores/survey-types', () => ({
  PHOTO_REQUIREMENTS: {
    exterior: { required: 2 },
  },
  MoldSizeCategory: {},
}))

describe('SurveySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Property section', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Property')).toBeInTheDocument()
  })

  it('shows property address', () => {
    render(<SurveySummary />)

    expect(screen.getByText('123 Main St, New York, NY, 10001')).toBeInTheDocument()
  })

  it('shows building type', () => {
    render(<SurveySummary />)

    expect(screen.getByText(/commercial office/)).toBeInTheDocument()
  })

  it('shows year built', () => {
    render(<SurveySummary />)

    expect(screen.getByText(/1970/)).toBeInTheDocument()
  })

  it('shows square footage', () => {
    render(<SurveySummary />)

    expect(screen.getByText(/5,000 sq ft/)).toBeInTheDocument()
  })

  it('shows stories count', () => {
    render(<SurveySummary />)

    expect(screen.getByText(/2 stories/)).toBeInTheDocument()
  })

  it('shows owner name', () => {
    render(<SurveySummary />)

    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders Hazards Identified section', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Hazards Identified')).toBeInTheDocument()
  })

  it('shows asbestos hazard info', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Asbestos')).toBeInTheDocument()
    expect(screen.getByText('2 materials documented')).toBeInTheDocument()
  })

  it('shows mold hazard info', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Mold')).toBeInTheDocument()
    expect(screen.getByText(/2 areas/)).toBeInTheDocument()
    expect(screen.getByText(/80 sq ft/)).toBeInTheDocument()
  })

  it('shows No hazards documented when none selected', () => {
    mockFormData = {
      ...mockFormData,
      hazards: {
        types: [],
        asbestos: null,
        mold: null,
        lead: null,
        other: null,
      },
    }
    render(<SurveySummary />)

    expect(screen.getByText('No hazards documented')).toBeInTheDocument()
  })

  it('renders Access section', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Access')).toBeInTheDocument()
    expect(screen.getByText('2 restrictions')).toBeInTheDocument()
  })

  it('renders Environment section', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Environment')).toBeInTheDocument()
    expect(screen.getByText(/72°F/)).toBeInTheDocument()
    expect(screen.getByText(/45% RH/)).toBeInTheDocument()
  })

  it('renders Photos section', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Photos')).toBeInTheDocument()
    expect(screen.getByText('3 total')).toBeInTheDocument()
    expect(screen.getByText(/2 exterior/)).toBeInTheDocument()
  })

  it('shows survey start time', () => {
    render(<SurveySummary />)

    expect(screen.getByText(/Survey started:/)).toBeInTheDocument()
  })
})
