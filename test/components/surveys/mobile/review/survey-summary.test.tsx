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
    areas: [
      {
        id: 'area-1',
        area_name: 'Basement',
        floor_level: '1st Floor',
        hazards: [
          { id: 'h1', hazard_type: 'asbestos', material_type: 'pipe_insulation', quantity: 50, unit: 'sq_ft', containment_level: null },
          { id: 'h2', hazard_type: 'mold', material_type: 'drywall', quantity: 30, unit: 'sq_ft', containment_level: null },
        ],
        photo_ids: [],
      },
      {
        id: 'area-2',
        area_name: 'Attic',
        floor_level: '2nd Floor',
        hazards: [
          { id: 'h3', hazard_type: 'asbestos', material_type: 'ceiling_tile', quantity: 80, unit: 'sq_ft', containment_level: null },
        ],
        photo_ids: [],
      },
    ],
  },
  photos: {
    photos: [
      { id: '1', category: 'exterior' },
      { id: '2', category: 'exterior' },
      { id: '3', category: 'interior' },
    ],
  },
}
const mockStartedAt = Date.now()

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
  CONTAINMENT_LABELS: {},
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

    expect(screen.getByText(/2 stor/)).toBeInTheDocument()
  })

  it('shows owner name', () => {
    render(<SurveySummary />)

    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders Areas & Hazards section', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Areas & Hazards')).toBeInTheDocument()
  })

  it('shows area count and hazard count', () => {
    render(<SurveySummary />)

    // 2 areas, 3 hazards
    expect(screen.getByText(/2 areas/)).toBeInTheDocument()
    expect(screen.getByText(/3 hazards/)).toBeInTheDocument()
  })

  it('shows area names', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Basement')).toBeInTheDocument()
    expect(screen.getByText('Attic')).toBeInTheDocument()
  })

  it('shows No areas documented when none exist', () => {
    mockFormData = {
      ...mockFormData,
      hazards: {
        areas: [],
      },
    }
    render(<SurveySummary />)

    expect(screen.getByText('No areas documented')).toBeInTheDocument()
  })

  it('renders Access section', () => {
    // Reset to original data
    mockFormData = {
      ...mockFormData,
      access: {
        hasRestrictions: true,
        restrictions: ['locked_areas', 'height_access'],
      },
      hazards: {
        areas: [
          {
            id: 'area-1',
            area_name: 'Basement',
            floor_level: '1st Floor',
            hazards: [{ id: 'h1', hazard_type: 'asbestos', material_type: 'pipe', quantity: 50, unit: 'sq_ft', containment_level: null }],
            photo_ids: [],
          },
        ],
      },
    }
    render(<SurveySummary />)

    expect(screen.getByText('Access')).toBeInTheDocument()
    expect(screen.getByText(/restriction/)).toBeInTheDocument()
  })

  it('renders Environment section', () => {
    render(<SurveySummary />)

    expect(screen.getByText('Environment')).toBeInTheDocument()
    expect(screen.getByText(/72°F/)).toBeInTheDocument()
    expect(screen.getByText(/45%/)).toBeInTheDocument()
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
