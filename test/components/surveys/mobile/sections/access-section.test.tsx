import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccessSection } from '@/components/surveys/mobile/sections/access-section'

// Mock inputs
vi.mock('@/components/surveys/mobile/inputs', () => ({
  YesNoToggle: ({ value, onChange }: any) => (
    <button data-testid="yes-no-toggle" onClick={() => onChange(!value)}>
      {value === null ? 'N/A' : value ? 'Yes' : 'No'}
    </button>
  ),
  YesNoNaToggle: ({ value, onChange }: any) => (
    <button data-testid="yes-no-na-toggle" onClick={() => onChange(!value)}>
      {value === null ? 'N/A' : value ? 'Yes' : 'No'}
    </button>
  ),
  CheckboxGroup: () => <div data-testid="checkbox-group">Checkbox Group</div>,
  RadioCardGroup: ({ value }: any) => <div data-testid="radio-card-group">{value}</div>,
  NumericStepper: ({ value, suffix }: any) => (
    <div data-testid="numeric-stepper">{value} {suffix}</div>
  ),
}))

// Mock survey store
const mockUpdateAccess = vi.fn()
let mockAccessData: any = {
  hasRestrictions: false,
  restrictions: [],
  restrictionNotes: '',
  parkingAvailable: null,
  loadingZoneAvailable: null,
  equipmentAccess: null,
  equipmentAccessNotes: '',
  elevatorAvailable: null,
  minDoorwayWidth: 36,
}

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      access: mockAccessData,
    },
    updateAccess: mockUpdateAccess,
  }),
}))

vi.mock('@/lib/stores/survey-types', () => ({
  AccessRestriction: {},
  EquipmentAccess: {},
}))

describe('AccessSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAccessData = {
      hasRestrictions: false,
      restrictions: [],
      restrictionNotes: '',
      parkingAvailable: null,
      loadingZoneAvailable: null,
      equipmentAccess: null,
      equipmentAccessNotes: '',
      elevatorAvailable: null,
      minDoorwayWidth: 36,
    }
  })

  it('renders access restrictions question', () => {
    render(<AccessSection />)

    expect(screen.getByText('Are there access restrictions?')).toBeInTheDocument()
  })

  it('renders parking question', () => {
    render(<AccessSection />)

    expect(screen.getByText('Is parking available?')).toBeInTheDocument()
  })

  it('renders loading zone question', () => {
    render(<AccessSection />)

    expect(screen.getByText('Is a loading zone available?')).toBeInTheDocument()
  })

  it('renders equipment access question', () => {
    render(<AccessSection />)

    expect(screen.getByText('Equipment Access')).toBeInTheDocument()
  })

  it('renders elevator question', () => {
    render(<AccessSection />)

    expect(screen.getByText('Is an elevator available?')).toBeInTheDocument()
  })

  it('renders doorway width section', () => {
    render(<AccessSection />)

    expect(screen.getByText('Minimum Doorway Width')).toBeInTheDocument()
    expect(screen.getByTestId('numeric-stepper')).toBeInTheDocument()
  })

  it('shows restriction details when hasRestrictions is true', () => {
    mockAccessData = { ...mockAccessData, hasRestrictions: true }
    render(<AccessSection />)

    expect(screen.getByText('Select all that apply:')).toBeInTheDocument()
    expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument()
  })

  it('does not show restriction details when hasRestrictions is false', () => {
    render(<AccessSection />)

    expect(screen.queryByText('Select all that apply:')).not.toBeInTheDocument()
  })

  it('shows equipment notes when access is limited', () => {
    mockAccessData = { ...mockAccessData, equipmentAccess: 'limited' }
    render(<AccessSection />)

    expect(screen.getByText('Describe the limitations')).toBeInTheDocument()
  })

  it('shows equipment notes when access is difficult', () => {
    mockAccessData = { ...mockAccessData, equipmentAccess: 'difficult' }
    render(<AccessSection />)

    expect(screen.getByText('Describe the limitations')).toBeInTheDocument()
  })

  it('shows warning for narrow doorways', () => {
    mockAccessData = { ...mockAccessData, minDoorwayWidth: 24 }
    render(<AccessSection />)

    expect(screen.getByText(/Equipment may require disassembly/)).toBeInTheDocument()
  })

  it('does not show warning for adequate doorway width', () => {
    mockAccessData = { ...mockAccessData, minDoorwayWidth: 36 }
    render(<AccessSection />)

    expect(screen.queryByText(/Equipment may require disassembly/)).not.toBeInTheDocument()
  })
})
