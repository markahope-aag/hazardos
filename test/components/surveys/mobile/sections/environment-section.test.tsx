import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnvironmentSection } from '@/components/surveys/mobile/sections/environment-section'

// Mock inputs
vi.mock('@/components/surveys/mobile/inputs', () => ({
  YesNoToggle: ({ value, onChange }: any) => (
    <button data-testid="yes-no-toggle" onClick={() => onChange(!value)}>
      {value === null ? 'N/A' : value ? 'Yes' : 'No'}
    </button>
  ),
  CheckboxGroup: () => <div data-testid="checkbox-group">Checkbox Group</div>,
  NumericStepper: ({ value, suffix }: any) => (
    <div data-testid="numeric-stepper">{value} {suffix}</div>
  ),
  VoiceNoteIconButton: () => <button data-testid="voice-note">Voice</button>,
}))

// Mock survey store
const mockUpdateEnvironment = vi.fn()
let mockEnvironmentData: any = {
  temperature: 72,
  humidity: 45,
  moistureIssues: [],
  moistureNotes: '',
  hasStructuralConcerns: false,
  structuralConcerns: [],
  structuralNotes: '',
  utilityShutoffsLocated: null,
}

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      environment: mockEnvironmentData,
    },
    updateEnvironment: mockUpdateEnvironment,
  }),
}))

vi.mock('@/lib/stores/survey-types', () => ({
  MoistureIssue: {},
  StructuralConcern: {},
}))

describe('EnvironmentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnvironmentData = {
      temperature: 72,
      humidity: 45,
      moistureIssues: [],
      moistureNotes: '',
      hasStructuralConcerns: false,
      structuralConcerns: [],
      structuralNotes: '',
      utilityShutoffsLocated: null,
    }
  })

  it('renders temperature section', () => {
    render(<EnvironmentSection />)

    expect(screen.getByText('Temperature')).toBeInTheDocument()
  })

  it('renders humidity section', () => {
    render(<EnvironmentSection />)

    expect(screen.getByText('Humidity')).toBeInTheDocument()
  })

  it('renders moisture issues section', () => {
    render(<EnvironmentSection />)

    expect(screen.getByText('Moisture Issues')).toBeInTheDocument()
  })

  it('renders structural concerns question', () => {
    render(<EnvironmentSection />)

    expect(screen.getByText('Are there structural concerns?')).toBeInTheDocument()
  })

  it('renders utility shutoffs question', () => {
    render(<EnvironmentSection />)

    expect(screen.getByText('Were utility shutoffs located?')).toBeInTheDocument()
  })

  it('shows high humidity warning when humidity > 60', () => {
    mockEnvironmentData = { ...mockEnvironmentData, humidity: 75 }
    render(<EnvironmentSection />)

    expect(screen.getByText(/High humidity.*75%.*may indicate moisture problems/)).toBeInTheDocument()
  })

  it('does not show high humidity warning when humidity <= 60', () => {
    mockEnvironmentData = { ...mockEnvironmentData, humidity: 50 }
    render(<EnvironmentSection />)

    expect(screen.queryByText(/High humidity/)).not.toBeInTheDocument()
  })

  it('shows moisture notes when moisture issues are selected', () => {
    mockEnvironmentData = { ...mockEnvironmentData, moistureIssues: ['active_leak'] }
    render(<EnvironmentSection />)

    expect(screen.getByLabelText('Moisture Notes')).toBeInTheDocument()
  })

  it('does not show moisture notes when only none_observed is selected', () => {
    mockEnvironmentData = { ...mockEnvironmentData, moistureIssues: ['none_observed'] }
    render(<EnvironmentSection />)

    expect(screen.queryByLabelText('Moisture Notes')).not.toBeInTheDocument()
  })

  it('shows structural details when hasStructuralConcerns is true', () => {
    mockEnvironmentData = { ...mockEnvironmentData, hasStructuralConcerns: true }
    render(<EnvironmentSection />)

    expect(screen.getByText('Structural Concerns')).toBeInTheDocument()
    expect(screen.getByLabelText('Additional Details')).toBeInTheDocument()
  })

  it('does not show structural details when hasStructuralConcerns is false', () => {
    render(<EnvironmentSection />)

    expect(screen.queryByLabelText('Additional Details')).not.toBeInTheDocument()
  })
})
