import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentBuilder } from '@/components/customers/segment-builder'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockAvailableFields = [
  { value: 'status', label: 'Status', type: 'string' },
  { value: 'email', label: 'Email', type: 'string' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
  { value: 'total_jobs', label: 'Total Jobs', type: 'number' },
]

describe('SegmentBuilder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without crashing', () => {
    expect(() =>
      render(<SegmentBuilder availableFields={mockAvailableFields} />)
    ).not.toThrow()
  })

  it('should display Create Segment title when no segment provided', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByRole('heading', { name: 'Create Segment' })).toBeInTheDocument()
  })

  it('should display Edit Segment title when segment provided', () => {
    const segment = {
      id: '1',
      org_id: 'org-1',
      name: 'Test Segment',
      description: 'Test description',
      segment_type: 'dynamic' as const,
      rules: [{ field: 'status', operator: '=' as const, value: 'active' }],
      customer_count: 10,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    render(<SegmentBuilder segment={segment} availableFields={mockAvailableFields} />)
    expect(screen.getByText('Edit Segment')).toBeInTheDocument()
  })

  it('should display Segment Name input', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByLabelText('Segment Name')).toBeInTheDocument()
  })

  it('should display Segment Type select', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByText('Segment Type')).toBeInTheDocument()
  })

  it('should display Description textarea', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
  })

  it('should display Segment Rules section', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByText('Segment Rules')).toBeInTheDocument()
  })

  it('should have default dynamic segment type', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByText('Dynamic (rule-based)')).toBeInTheDocument()
  })

  it('should display Add Rule button', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument()
  })

  it('should display Cancel button', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should display Create Segment submit button', () => {
    render(<SegmentBuilder availableFields={mockAvailableFields} />)
    expect(screen.getByRole('button', { name: /create segment/i })).toBeInTheDocument()
  })

  it('should display Update Segment button when editing', () => {
    const segment = {
      id: '1',
      org_id: 'org-1',
      name: 'Test Segment',
      description: null,
      segment_type: 'dynamic' as const,
      rules: [{ field: 'status', operator: '=' as const, value: 'active' }],
      customer_count: 10,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    render(<SegmentBuilder segment={segment} availableFields={mockAvailableFields} />)
    expect(screen.getByRole('button', { name: /update segment/i })).toBeInTheDocument()
  })

  it('should allow typing in segment name', async () => {
    const user = userEvent.setup()

    render(<SegmentBuilder availableFields={mockAvailableFields} />)

    const nameInput = screen.getByLabelText('Segment Name')
    await user.type(nameInput, 'High Value Customers')

    expect(nameInput).toHaveValue('High Value Customers')
  })

  it('should allow typing in description', async () => {
    const user = userEvent.setup()

    render(<SegmentBuilder availableFields={mockAvailableFields} />)

    const descInput = screen.getByLabelText('Description (optional)')
    await user.type(descInput, 'Customers with high lifetime value')

    expect(descInput).toHaveValue('Customers with high lifetime value')
  })

  it('should add new rule when Add Rule clicked', async () => {
    const user = userEvent.setup()

    render(<SegmentBuilder availableFields={mockAvailableFields} />)

    const addRuleButton = screen.getByRole('button', { name: /add rule/i })
    await user.click(addRuleButton)

    // Should now have 2 rules (1 default + 1 new)
    const fieldLabels = screen.getAllByText('Field')
    expect(fieldLabels).toHaveLength(2)
  })

  it('should pre-fill values when segment is provided', () => {
    const segment = {
      id: '1',
      org_id: 'org-1',
      name: 'Premium Customers',
      description: 'High value customers',
      segment_type: 'dynamic' as const,
      rules: [{ field: 'status', operator: '=' as const, value: 'active' }],
      customer_count: 10,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    render(<SegmentBuilder segment={segment} availableFields={mockAvailableFields} />)

    expect(screen.getByLabelText('Segment Name')).toHaveValue('Premium Customers')
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('High value customers')
  })
})
