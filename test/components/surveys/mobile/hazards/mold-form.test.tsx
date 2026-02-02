import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoldForm } from '@/components/surveys/mobile/hazards/mold-form'

// Mock child components
vi.mock('@/components/surveys/mobile/hazards/mold-area-card', () => ({
  MoldAreaCard: ({ area, index }: any) => (
    <div data-testid={`area-card-${index}`}>Area {area.id}</div>
  ),
}))

vi.mock('@/components/surveys/mobile/hazards/mold-summary', () => ({
  MoldSummary: () => <div data-testid="mold-summary">Summary</div>,
}))

vi.mock('@/components/surveys/mobile/inputs', () => ({
  YesNoToggle: ({ value, onChange }: any) => (
    <button data-testid="yes-no-toggle" onClick={() => onChange(!value)}>
      {value ? 'Yes' : 'No'}
    </button>
  ),
  CheckboxGroup: () => <div data-testid="checkbox-group">Checkbox Group</div>,
  SegmentedControl: ({ value }: any) => <div data-testid="segmented-control">{value}</div>,
}))

// Mock survey store
const mockAddMoldArea = vi.fn()
const mockUpdateHazards = vi.fn()
let mockMoldData: any = null

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      hazards: {
        mold: mockMoldData,
      },
    },
    addMoldArea: mockAddMoldArea,
    updateHazards: mockUpdateHazards,
  }),
}))

vi.mock('@/lib/stores/survey-types', () => ({
  MoistureSourceType: {},
  MoistureSourceStatus: {},
}))

describe('MoldForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMoldData = {
      moistureSourceIdentified: false,
      moistureSourceTypes: [],
      moistureSourceStatus: 'active',
      moistureSourceNotes: '',
      affectedAreas: [],
    }
  })

  it('returns null when mold data is null', () => {
    mockMoldData = null
    const { container } = render(<MoldForm />)

    expect(container.firstChild).toBeNull()
  })

  it('renders Moisture Assessment section', () => {
    render(<MoldForm />)

    expect(screen.getByText('Moisture Assessment')).toBeInTheDocument()
  })

  it('renders moisture source identified question', () => {
    render(<MoldForm />)

    expect(screen.getByText('Has the moisture source been identified?')).toBeInTheDocument()
  })

  it('renders Affected Areas section', () => {
    render(<MoldForm />)

    expect(screen.getByText('Affected Areas')).toBeInTheDocument()
  })

  it('shows area count', () => {
    mockMoldData = {
      ...mockMoldData,
      affectedAreas: [{ id: '1' }, { id: '2' }],
    }
    render(<MoldForm />)

    expect(screen.getByText('2 areas')).toBeInTheDocument()
  })

  it('shows singular area text', () => {
    mockMoldData = {
      ...mockMoldData,
      affectedAreas: [{ id: '1' }],
    }
    render(<MoldForm />)

    expect(screen.getByText('1 area')).toBeInTheDocument()
  })

  it('shows empty state when no areas', () => {
    render(<MoldForm />)

    expect(screen.getByText('No affected areas documented yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add first area/i })).toBeInTheDocument()
  })

  it('calls addMoldArea when add button clicked', async () => {
    const user = userEvent.setup()
    render(<MoldForm />)

    await user.click(screen.getByRole('button', { name: /add first area/i }))

    expect(mockAddMoldArea).toHaveBeenCalled()
  })

  it('renders area cards when areas exist', () => {
    mockMoldData = {
      ...mockMoldData,
      affectedAreas: [{ id: 'area-1' }, { id: 'area-2' }],
    }
    render(<MoldForm />)

    expect(screen.getByTestId('area-card-0')).toBeInTheDocument()
    expect(screen.getByTestId('area-card-1')).toBeInTheDocument()
  })

  it('shows summary when areas exist', () => {
    mockMoldData = {
      ...mockMoldData,
      affectedAreas: [{ id: '1' }],
    }
    render(<MoldForm />)

    expect(screen.getByTestId('mold-summary')).toBeInTheDocument()
  })

  it('shows moisture source options when identified is true', () => {
    mockMoldData = {
      ...mockMoldData,
      moistureSourceIdentified: true,
    }
    render(<MoldForm />)

    expect(screen.getByText('Source Types')).toBeInTheDocument()
    expect(screen.getByText('Source Status')).toBeInTheDocument()
  })
})
