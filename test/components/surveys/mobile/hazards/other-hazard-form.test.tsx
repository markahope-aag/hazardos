import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtherHazardForm } from '@/components/surveys/mobile/hazards/other-hazard-form'

// Mock survey store
const mockUpdateHazards = vi.fn()
let mockOtherData: any = null

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      hazards: {
        other: mockOtherData,
      },
    },
    updateHazards: mockUpdateHazards,
  }),
}))

describe('OtherHazardForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOtherData = {
      description: '',
      notes: '',
    }
  })

  it('returns null when other data is null', () => {
    mockOtherData = null
    const { container } = render(<OtherHazardForm />)

    expect(container.firstChild).toBeNull()
  })

  it('renders info banner', () => {
    render(<OtherHazardForm />)

    expect(screen.getByText('Other Hazardous Materials')).toBeInTheDocument()
    expect(screen.getByText(/Document any additional environmental hazards/)).toBeInTheDocument()
  })

  it('renders Hazard Description section', () => {
    render(<OtherHazardForm />)

    expect(screen.getByText('Hazard Description')).toBeInTheDocument()
    expect(screen.getByText(/Describe the type of hazard/)).toBeInTheDocument()
  })

  it('renders description textarea', () => {
    render(<OtherHazardForm />)

    expect(screen.getByLabelText('Hazard Description')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Describe the hazardous material/)).toBeInTheDocument()
  })

  it('renders Additional Notes section', () => {
    render(<OtherHazardForm />)

    expect(screen.getByText('Additional Notes')).toBeInTheDocument()
    expect(screen.getByText(/Include location, quantity estimates/)).toBeInTheDocument()
  })

  it('renders notes textarea', () => {
    render(<OtherHazardForm />)

    expect(screen.getByLabelText('Additional Notes')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Location details, quantity estimates/)).toBeInTheDocument()
  })

  it('populates description from store', () => {
    mockOtherData = {
      description: 'PCB contamination',
      notes: '',
    }
    render(<OtherHazardForm />)

    expect(screen.getByDisplayValue('PCB contamination')).toBeInTheDocument()
  })

  it('populates notes from store', () => {
    mockOtherData = {
      description: '',
      notes: 'Found in basement',
    }
    render(<OtherHazardForm />)

    expect(screen.getByDisplayValue('Found in basement')).toBeInTheDocument()
  })

  it('calls updateHazards when description changes', async () => {
    const user = userEvent.setup()
    render(<OtherHazardForm />)

    const descriptionInput = screen.getByLabelText('Hazard Description')
    await user.type(descriptionInput, 'Mercury')

    expect(mockUpdateHazards).toHaveBeenCalled()
  })

  it('calls updateHazards when notes change', async () => {
    const user = userEvent.setup()
    render(<OtherHazardForm />)

    const notesInput = screen.getByLabelText('Additional Notes')
    await user.type(notesInput, 'Storage area')

    expect(mockUpdateHazards).toHaveBeenCalled()
  })
})
