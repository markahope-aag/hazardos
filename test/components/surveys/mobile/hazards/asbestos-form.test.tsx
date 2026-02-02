import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AsbestosForm } from '@/components/surveys/mobile/hazards/asbestos-form'

// Mock child components
vi.mock('@/components/surveys/mobile/hazards/asbestos-material-card', () => ({
  AsbestosMaterialCard: ({ material, index }: any) => (
    <div data-testid={`material-card-${index}`}>Material {material.id}</div>
  ),
}))

vi.mock('@/components/surveys/mobile/hazards/asbestos-summary', () => ({
  AsbestosSummary: () => <div data-testid="asbestos-summary">Summary</div>,
}))

// Mock survey store
const mockAddAsbestosMaterial = vi.fn()
let mockAsbestosData: any = null

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => ({
    formData: {
      hazards: {
        asbestos: mockAsbestosData,
      },
    },
    addAsbestosMaterial: mockAddAsbestosMaterial,
  }),
}))

describe('AsbestosForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAsbestosData = {
      materials: [],
    }
  })

  it('returns null when asbestos data is null', () => {
    mockAsbestosData = null
    const { container } = render(<AsbestosForm />)

    expect(container.firstChild).toBeNull()
  })

  it('renders materials inventory label', () => {
    render(<AsbestosForm />)

    expect(screen.getByText('Materials Inventory')).toBeInTheDocument()
  })

  it('shows material count', () => {
    mockAsbestosData = {
      materials: [{ id: '1' }, { id: '2' }],
    }
    render(<AsbestosForm />)

    expect(screen.getByText('2 materials')).toBeInTheDocument()
  })

  it('shows singular material text', () => {
    mockAsbestosData = {
      materials: [{ id: '1' }],
    }
    render(<AsbestosForm />)

    expect(screen.getByText('1 material')).toBeInTheDocument()
  })

  it('shows empty state when no materials', () => {
    render(<AsbestosForm />)

    expect(screen.getByText('No materials documented yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add first material/i })).toBeInTheDocument()
  })

  it('calls addAsbestosMaterial when add button clicked', async () => {
    const user = userEvent.setup()
    render(<AsbestosForm />)

    await user.click(screen.getByRole('button', { name: /add first material/i }))

    expect(mockAddAsbestosMaterial).toHaveBeenCalled()
  })

  it('renders material cards when materials exist', () => {
    mockAsbestosData = {
      materials: [{ id: 'mat-1' }, { id: 'mat-2' }],
    }
    render(<AsbestosForm />)

    expect(screen.getByTestId('material-card-0')).toBeInTheDocument()
    expect(screen.getByTestId('material-card-1')).toBeInTheDocument()
  })

  it('shows Add Another Material button when materials exist', () => {
    mockAsbestosData = {
      materials: [{ id: '1' }],
    }
    render(<AsbestosForm />)

    expect(screen.getByRole('button', { name: /add another material/i })).toBeInTheDocument()
  })

  it('shows summary when materials exist', () => {
    mockAsbestosData = {
      materials: [{ id: '1' }],
    }
    render(<AsbestosForm />)

    expect(screen.getByTestId('asbestos-summary')).toBeInTheDocument()
  })

  it('does not show summary when no materials', () => {
    render(<AsbestosForm />)

    expect(screen.queryByTestId('asbestos-summary')).not.toBeInTheDocument()
  })
})
