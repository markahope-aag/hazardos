import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HazardsSection } from '@/components/surveys/mobile/sections/hazards-section'

// Mock the survey store
const mockAreas: any[] = []
const mockPhotos: any[] = []
const mockAddArea = vi.fn().mockReturnValue('area-new')
const mockUpdateArea = vi.fn()
const mockRemoveArea = vi.fn()
const mockAddHazardToArea = vi.fn().mockReturnValue('hazard-new')
const mockUpdateHazard = vi.fn()
const mockRemoveHazard = vi.fn()

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: (selector?: (state: any) => any) => {
    const state = {
      formData: {
        hazards: { areas: mockAreas },
        photos: { photos: mockPhotos },
      },
      addArea: mockAddArea,
      updateArea: mockUpdateArea,
      removeArea: mockRemoveArea,
      addHazardToArea: mockAddHazardToArea,
      updateHazard: mockUpdateHazard,
      removeHazard: mockRemoveHazard,
    }
    if (selector) return selector(state)
    return state
  },
}))

vi.mock('@/lib/stores/survey-types', () => ({
  HazardType: {},
  MATERIAL_TYPES_BY_HAZARD: {},
  CONDITION_OPTIONS_BY_HAZARD: {},
  CONTAINMENT_LABELS: {},
  suggestContainment: vi.fn(() => null),
}))

describe('HazardsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAreas.length = 0
  })

  it('renders section title', () => {
    render(<HazardsSection />)

    expect(screen.getByText('Areas & Hazards')).toBeInTheDocument()
  })

  it('shows empty state when no areas', () => {
    render(<HazardsSection />)

    expect(screen.getByText('No areas documented yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add area/i })).toBeInTheDocument()
  })

  it('calls addArea when add button clicked', async () => {
    const user = userEvent.setup()
    render(<HazardsSection />)

    await user.click(screen.getByRole('button', { name: /add area/i }))

    expect(mockAddArea).toHaveBeenCalled()
  })

  it('shows areas when they exist', () => {
    mockAreas.push({
      id: 'area-1',
      area_name: 'Basement',
      floor_level: '1st Floor',
      hazards: [
        { id: 'h1', hazard_type: 'asbestos', material_type: 'pipe_insulation', quantity: 50, unit: 'sq_ft', condition: '', containment_level: null, notes: '' },
      ],
      photo_ids: [],
    })

    render(<HazardsSection />)

    expect(screen.getByText('Basement')).toBeInTheDocument()
    expect(screen.getByText(/1 hazard/)).toBeInTheDocument()
  })

  it('shows description text', () => {
    render(<HazardsSection />)

    expect(screen.getByText(/document hazards by area/i)).toBeInTheDocument()
  })
})
