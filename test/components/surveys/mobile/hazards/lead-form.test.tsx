import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadForm } from '@/components/surveys/mobile/hazards/lead-form'

// Mock child components
vi.mock('@/components/surveys/mobile/hazards/lead-component-card', () => ({
  LeadComponentCard: ({ component, index }: any) => (
    <div data-testid={`component-card-${index}`}>Component {component.id}</div>
  ),
}))

vi.mock('@/components/surveys/mobile/hazards/lead-summary', () => ({
  LeadSummary: () => <div data-testid="lead-summary">Summary</div>,
}))

vi.mock('@/components/surveys/mobile/inputs', () => ({
  YesNoToggle: ({ value, onChange }: any) => (
    <button data-testid="yes-no-toggle" onClick={() => onChange(!value)}>
      {value ? 'Yes' : 'No'}
    </button>
  ),
  RadioCardGroup: ({ value }: any) => <div data-testid="radio-card-group">{value}</div>,
}))

// Mock survey store
const mockAddLeadComponent = vi.fn()
const mockUpdateHazards = vi.fn()
let mockLeadData: any = null
let mockYearBuilt: number | null = 1970

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      property: {
        yearBuilt: mockYearBuilt,
      },
      hazards: {
        lead: mockLeadData,
      },
    },
    addLeadComponent: mockAddLeadComponent,
    updateHazards: mockUpdateHazards,
  }),
}))

vi.mock('@/lib/stores/survey-types', () => ({
  LeadWorkScope: {},
}))

describe('LeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockYearBuilt = 1970
    mockLeadData = {
      childrenUnder6Present: false,
      workScope: 'interior_only',
      components: [],
    }
  })

  it('returns null when lead data is null', () => {
    mockLeadData = null
    const { container } = render(<LeadForm />)

    expect(container.firstChild).toBeNull()
  })

  it('shows pre-1978 warning for old buildings', () => {
    mockYearBuilt = 1960
    render(<LeadForm />)

    expect(screen.getByText('Pre-1978 Building')).toBeInTheDocument()
    expect(screen.getByText(/Year built: 1960/)).toBeInTheDocument()
  })

  it('does not show pre-1978 warning for newer buildings', () => {
    mockYearBuilt = 1985
    render(<LeadForm />)

    expect(screen.queryByText('Pre-1978 Building')).not.toBeInTheDocument()
  })

  it('renders children under 6 question', () => {
    render(<LeadForm />)

    expect(screen.getByText('Are children under 6 present?')).toBeInTheDocument()
  })

  it('shows warning when children are present', () => {
    mockLeadData = {
      ...mockLeadData,
      childrenUnder6Present: true,
    }
    render(<LeadForm />)

    expect(screen.getByText(/Enhanced lead-safe work practices required/)).toBeInTheDocument()
  })

  it('renders Work Scope section', () => {
    render(<LeadForm />)

    expect(screen.getByText('Work Scope')).toBeInTheDocument()
  })

  it('renders Lead-Painted Components section', () => {
    render(<LeadForm />)

    expect(screen.getByText('Lead-Painted Components')).toBeInTheDocument()
  })

  it('shows component count', () => {
    mockLeadData = {
      ...mockLeadData,
      components: [{ id: '1' }, { id: '2' }],
    }
    render(<LeadForm />)

    expect(screen.getByText('2 components')).toBeInTheDocument()
  })

  it('shows singular component text', () => {
    mockLeadData = {
      ...mockLeadData,
      components: [{ id: '1' }],
    }
    render(<LeadForm />)

    expect(screen.getByText('1 component')).toBeInTheDocument()
  })

  it('shows empty state when no components', () => {
    render(<LeadForm />)

    expect(screen.getByText('No components documented yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add first component/i })).toBeInTheDocument()
  })

  it('calls addLeadComponent when add button clicked', async () => {
    const user = userEvent.setup()
    render(<LeadForm />)

    await user.click(screen.getByRole('button', { name: /add first component/i }))

    expect(mockAddLeadComponent).toHaveBeenCalled()
  })

  it('renders component cards when components exist', () => {
    mockLeadData = {
      ...mockLeadData,
      components: [{ id: 'comp-1' }, { id: 'comp-2' }],
    }
    render(<LeadForm />)

    expect(screen.getByTestId('component-card-0')).toBeInTheDocument()
    expect(screen.getByTestId('component-card-1')).toBeInTheDocument()
  })

  it('shows summary when components exist', () => {
    mockLeadData = {
      ...mockLeadData,
      components: [{ id: '1' }],
    }
    render(<LeadForm />)

    expect(screen.getByTestId('lead-summary')).toBeInTheDocument()
  })
})
