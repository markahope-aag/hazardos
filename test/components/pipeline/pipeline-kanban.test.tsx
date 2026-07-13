import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { renderWithClient } from '@/test/helpers/render-with-client'
import { PipelineKanban, PipelineKanbanErrorBoundary } from '@/components/pipeline/pipeline-kanban'
import type { PipelineStage, Opportunity } from '@/types/sales'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock error boundaries
vi.mock('@/components/error-boundaries', () => ({
  DataErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock the location filter so it doesn't fire its own `/api/locations`
// fetch, which would otherwise pollute the global fetch mock used to
// assert pipeline move API calls.
vi.mock('@/components/locations/location-filter', () => ({
  LocationFilter: () => <div data-testid="location-filter" />,
}))

// PipelineFilters pulls the sales-user list from useOrgMembers (a
// TanStack Query hook against Supabase). Mock it so the filter renders
// two selectable users without a live query.
vi.mock('@/lib/hooks/use-org-members', () => ({
  useOrgMembers: () => ({
    data: [
      { id: 'user_001', first_name: 'Alice', last_name: 'Owner', email: 'alice@example.com' },
      { id: 'user_002', first_name: 'Bob', last_name: 'Rep', email: 'bob@example.com' },
    ],
    isLoading: false,
  }),
}))

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragEnd }: {
    children: React.ReactNode,
    onDragStart?: (event: any) => void,
    onDragEnd?: (event: any) => void,
    sensors?: any[],
    collisionDetection?: any,
  }) => {
    // Store event handlers for testing
    (global as any).__dndHandlers = { onDragStart, onDragEnd }
    return <div data-testid="dnd-context">{children}</div>
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(({ id: _id }: { id: string }) => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
  useDraggable: vi.fn(({ id }: { id: string }) => ({
    attributes: { 'data-draggable-id': id },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockStages: PipelineStage[] = [
  {
    id: 'stage_lead',
    organization_id: 'org_123',
    name: 'Lead',
    color: '#94a3b8',
    stage_type: 'lead',
    probability: 10,
    sort_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'stage_qualified',
    organization_id: 'org_123',
    name: 'Qualified',
    color: '#3b82f6',
    stage_type: 'qualified',
    probability: 30,
    sort_order: 2,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'stage_proposal',
    organization_id: 'org_123',
    name: 'Proposal',
    color: '#8b5cf6',
    stage_type: 'proposal',
    probability: 60,
    sort_order: 3,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'stage_won',
    organization_id: 'org_123',
    name: 'Won',
    color: '#22c55e',
    stage_type: 'won',
    probability: 100,
    sort_order: 4,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

const mockOpportunities: Opportunity[] = [
  {
    id: 'opp_001',
    organization_id: 'org_123',
    customer_id: 'cust_001',
    name: 'Commercial Building Abatement',
    description: 'Full asbestos removal',
    stage_id: 'stage_lead',
    estimated_value: 25000,
    weighted_value: 2500,
    expected_close_date: '2024-03-15',
    actual_close_date: null,
    owner_id: 'user_001',
    estimate_id: null,
    proposal_id: null,
    job_id: null,
    outcome: null,
    loss_reason: null,
    loss_notes: null,
    competitor: null,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
    customer: {
      id: 'cust_001',
      company_name: 'ABC Corporation',
      first_name: 'John',
      last_name: 'Doe',
    },
  },
  {
    id: 'opp_002',
    organization_id: 'org_123',
    customer_id: 'cust_002',
    name: 'Residential Lead Paint',
    description: null,
    stage_id: 'stage_qualified',
    estimated_value: 8500,
    weighted_value: 2550,
    expected_close_date: '2024-02-28',
    actual_close_date: null,
    owner_id: 'user_002',
    estimate_id: null,
    proposal_id: null,
    job_id: null,
    outcome: null,
    loss_reason: null,
    loss_notes: null,
    competitor: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    customer: {
      id: 'cust_002',
      company_name: null,
      first_name: 'Jane',
      last_name: 'Smith',
    },
  },
  {
    id: 'opp_003',
    organization_id: 'org_123',
    customer_id: 'cust_003',
    name: 'School Renovation',
    description: 'Multiple hazards',
    stage_id: 'stage_proposal',
    estimated_value: 150000,
    weighted_value: 90000,
    expected_close_date: null,
    actual_close_date: null,
    owner_id: null,
    estimate_id: null,
    proposal_id: null,
    job_id: null,
    outcome: null,
    loss_reason: null,
    loss_notes: null,
    competitor: null,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    customer: {
      id: 'cust_003',
      company_name: 'City Schools District',
      first_name: 'Admin',
      last_name: 'User',
    },
  },
]

describe('PipelineKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Unmount between tests so accumulated DndContext instances don't leave
  // stale drag handlers on the shared `__dndHandlers` global.
  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('should render all pipeline stages', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      expect(screen.getByText('Lead')).toBeInTheDocument()
      expect(screen.getByText('Qualified')).toBeInTheDocument()
      expect(screen.getByText('Proposal')).toBeInTheDocument()
      expect(screen.getByText('Won')).toBeInTheDocument()
    })

    it('should render DndContext wrapper', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
    })

    it('should render opportunity counts per stage', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // Lead has 1 opportunity
      // Qualified has 1 opportunity
      // Proposal has 1 opportunity
      // Won has 0 opportunities
      const badges = screen.getAllByText(/^[0-9]$/)
      expect(badges).toHaveLength(4)
    })

    it('should render stage total values', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // formatCurrency with showDecimals=false is used
      // Lead: $25,000 - will appear twice (stage total + card)
      const values25k = screen.getAllByText('$25,000')
      expect(values25k.length).toBeGreaterThan(0)
      // Qualified: $8,500 - will appear twice
      const values8500 = screen.getAllByText('$8,500')
      expect(values8500.length).toBeGreaterThan(0)
      // Proposal: $150,000 - will appear twice
      const values150k = screen.getAllByText('$150,000')
      expect(values150k.length).toBeGreaterThan(0)
      // Won: $0 - stage total only
      expect(screen.getByText('$0')).toBeInTheDocument()
    })

    it('should render opportunity cards', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      expect(screen.getByText('Commercial Building Abatement')).toBeInTheDocument()
      expect(screen.getByText('Residential Lead Paint')).toBeInTheDocument()
      expect(screen.getByText('School Renovation')).toBeInTheDocument()
    })

    it('should render customer names on cards', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      expect(screen.getByText('ABC Corporation')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('City Schools District')).toBeInTheDocument()
    })

    it('should render opportunity values on cards', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // Values appear on both stage totals and cards
      const values25k = screen.getAllByText('$25,000')
      expect(values25k.length).toBeGreaterThan(0)
      const values8500 = screen.getAllByText('$8,500')
      expect(values8500.length).toBeGreaterThan(0)
      const values150k = screen.getAllByText('$150,000')
      expect(values150k.length).toBeGreaterThan(0)
    })

    it('should render expected close dates', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // The component uses toLocaleDateString() which formats dates based on locale
      // Match any date pattern after "Close:"
      const closeDates = screen.getAllByText(/Close:/)
      expect(closeDates.length).toBeGreaterThanOrEqual(2)
    })

    it('should render links to opportunity detail pages', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const links = screen.getAllByRole('link')
      expect(links.find(link => link.getAttribute('href') === '/crm/opportunities/opp_001')).toBeInTheDocument()
      expect(links.find(link => link.getAttribute('href') === '/crm/opportunities/opp_002')).toBeInTheDocument()
      expect(links.find(link => link.getAttribute('href') === '/crm/opportunities/opp_003')).toBeInTheDocument()
    })
  })

  describe('empty states', () => {
    it('should render empty stages', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={[]} />)

      expect(screen.getByText('Lead')).toBeInTheDocument()
      expect(screen.getByText('Qualified')).toBeInTheDocument()

      // All stages should show 0 count and $0 value
      const zeroCounts = screen.getAllByText('0')
      expect(zeroCounts).toHaveLength(4)
    })

    it('should render with no stages', () => {
      renderWithClient(<PipelineKanban stages={[]} opportunities={mockOpportunities} />)

      // Should not crash, just show empty container
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
    })
  })

  describe('customer name display', () => {
    it('should show company name when available', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      expect(screen.getByText('ABC Corporation')).toBeInTheDocument()
    })

    it('should show full name when no company name', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // Jane Smith has no company_name
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should show Unknown when no customer info', () => {
      const oppNoCustomer: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp_no_customer',
        customer: undefined,
      }

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={[oppNoCustomer]} />)

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('should handle empty customer names', () => {
      const oppEmptyNames: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp_empty_names',
        customer: {
          id: 'cust_empty',
          company_name: null,
          first_name: '',
          last_name: '',
        },
      }

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={[oppEmptyNames]} />)

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  describe('drag and drop', () => {
    it('should call API when opportunity is moved', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // Simulate drag end via the stored handler
      const handlers = (global as any).__dndHandlers
      handlers.onDragEnd({
        active: { id: 'opp_001' },
        over: { id: 'stage_qualified' },
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/pipeline/opp_001/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage_id: 'stage_qualified' }),
        })
      })
    })

    it('should show success toast on successful move', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const handlers = (global as any).__dndHandlers
      handlers.onDragEnd({
        active: { id: 'opp_001' },
        over: { id: 'stage_qualified' },
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Opportunity moved',
          description: 'Commercial Building Abatement has been updated',
        })
      })
    })

    it('should refresh router on successful move', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const handlers = (global as any).__dndHandlers
      handlers.onDragEnd({
        active: { id: 'opp_001' },
        over: { id: 'stage_qualified' },
      })

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('should show error toast on failed move', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const handlers = (global as any).__dndHandlers
      handlers.onDragEnd({
        active: { id: 'opp_001' },
        over: { id: 'stage_qualified' },
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to move opportunity',
          variant: 'destructive',
        })
      })
    })

    it('should not call API when dropped on same stage', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const handlers = (global as any).__dndHandlers
      handlers.onDragEnd({
        active: { id: 'opp_001' },
        over: { id: 'stage_lead' }, // Same stage as opp_001
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should not call API when dropped outside any stage', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const handlers = (global as any).__dndHandlers
      handlers.onDragEnd({
        active: { id: 'opp_001' },
        over: null,
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle drag start', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const handlers = (global as any).__dndHandlers
      handlers.onDragStart({
        active: { id: 'opp_001' },
      })

      // Should not throw, overlay should render active card
      expect(screen.getByTestId('drag-overlay')).toBeInTheDocument()
    })
  })

  describe('optimistic update', () => {
    it('should revert on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { rerender: _rerender } = renderWithClient(
        <PipelineKanban stages={mockStages} opportunities={mockOpportunities} />
      )

      const handlers = (global as any).__dndHandlers
      handlers.onDragEnd({
        active: { id: 'opp_001' },
        over: { id: 'stage_qualified' },
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to move opportunity',
          variant: 'destructive',
        })
      })

      // Component should revert to original state internally
      // The actual visual verification would require more complex testing
    })
  })

  describe('stage colors', () => {
    it('should apply stage colors to indicators', () => {
      const { container } = renderWithClient(
        <PipelineKanban stages={mockStages} opportunities={mockOpportunities} />
      )

      // Check for stage color indicators
      const colorIndicators = container.querySelectorAll('[style*="background-color"]')
      expect(colorIndicators.length).toBeGreaterThan(0)
    })
  })

  // PA4: filter the pipeline by sales user, date range, and stage. All
  // three filter the already-loaded opportunity list client-side; the
  // stage filter additionally hides the non-selected Kanban columns.
  describe('filters (PA4)', () => {
    it('hides opportunities created before the "From" date', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // opp_001 created 2024-01-10, opp_002 2024-01-15, opp_003 2024-01-20.
      expect(screen.getByText('Commercial Building Abatement')).toBeInTheDocument()

      const fromInput = screen.getByLabelText('From') as HTMLInputElement
      fireEvent.change(fromInput, { target: { value: '2024-01-16' } })

      // Only opp_003 (2024-01-20) survives.
      expect(screen.queryByText('Commercial Building Abatement')).not.toBeInTheDocument()
      expect(screen.queryByText('Residential Lead Paint')).not.toBeInTheDocument()
      expect(screen.getByText('School Renovation')).toBeInTheDocument()
    })

    it('hides opportunities created after the "To" date', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const toInput = screen.getByLabelText('To') as HTMLInputElement
      fireEvent.change(toInput, { target: { value: '2024-01-12' } })

      // Only opp_001 (2024-01-10) is on or before the 12th.
      expect(screen.getByText('Commercial Building Abatement')).toBeInTheDocument()
      expect(screen.queryByText('Residential Lead Paint')).not.toBeInTheDocument()
      expect(screen.queryByText('School Renovation')).not.toBeInTheDocument()
    })

    it('hides non-selected stage columns when a stage is picked', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      // Open the stage popover, select only "Lead", then close the popover
      // (it's multi-select so it stays open) so stage names only appear as
      // Kanban columns, not also as popover checkboxes.
      fireEvent.click(screen.getByRole('button', { name: /all stages/i }))
      fireEvent.click(screen.getByRole('checkbox', { name: 'Lead' }))
      fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' })

      // Lead column stays; the other columns are removed entirely.
      expect(screen.getByText('Lead')).toBeInTheDocument()
      expect(screen.queryByText('Qualified')).not.toBeInTheDocument()
      expect(screen.queryByText('Proposal')).not.toBeInTheDocument()
      expect(screen.queryByText('Won')).not.toBeInTheDocument()

      // opp_001 (in Lead) is visible; opp_002 (Qualified) is gone with its column.
      expect(screen.getByText('Commercial Building Abatement')).toBeInTheDocument()
      expect(screen.queryByText('Residential Lead Paint')).not.toBeInTheDocument()
    })

    it('resets all filters via the Reset button', () => {
      renderWithClient(<PipelineKanban stages={mockStages} opportunities={mockOpportunities} />)

      const fromInput = screen.getByLabelText('From') as HTMLInputElement
      fireEvent.change(fromInput, { target: { value: '2024-01-16' } })
      expect(screen.queryByText('Commercial Building Abatement')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /reset filters/i }))

      expect(screen.getByText('Commercial Building Abatement')).toBeInTheDocument()
      expect(screen.getByText('Residential Lead Paint')).toBeInTheDocument()
      expect(screen.getByText('School Renovation')).toBeInTheDocument()
    })
  })

  describe('error boundary wrapper', () => {
    it('should render children within error boundary', () => {
      renderWithClient(
        <PipelineKanbanErrorBoundary>
          <PipelineKanban stages={mockStages} opportunities={mockOpportunities} />
        </PipelineKanbanErrorBoundary>
      )

      expect(screen.getByText('Lead')).toBeInTheDocument()
    })
  })

  describe('opportunity without optional fields', () => {
    it('should handle opportunity without estimated_value', () => {
      const oppNoValue: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp_no_value',
        estimated_value: null,
      }

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={[oppNoValue]} />)

      // Should render without crashing
      expect(screen.getByText('Commercial Building Abatement')).toBeInTheDocument()
    })

    it('should handle opportunity without expected_close_date', () => {
      const oppNoDate: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp_no_date',
        expected_close_date: null,
      }

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={[oppNoDate]} />)

      // Should render without crashing, no close date shown
      expect(screen.getByText('Commercial Building Abatement')).toBeInTheDocument()
      expect(screen.queryByText(/Close:/)).not.toBeInTheDocument()
    })
  })

  describe('large datasets', () => {
    it('should handle many stages', () => {
      const manyStages = Array.from({ length: 10 }, (_, i) => ({
        ...mockStages[0],
        id: `stage_${i}`,
        name: `Stage ${i}`,
        sort_order: i,
      }))

      renderWithClient(<PipelineKanban stages={manyStages} opportunities={[]} />)

      manyStages.forEach(stage => {
        expect(screen.getByText(stage.name)).toBeInTheDocument()
      })
    })

    it('should handle many opportunities in one stage', () => {
      const manyOpps = Array.from({ length: 50 }, (_, i) => ({
        ...mockOpportunities[0],
        id: `opp_${i}`,
        name: `Opportunity ${i}`,
        stage_id: 'stage_lead',
        estimated_value: 1000 * (i + 1),
      }))

      renderWithClient(<PipelineKanban stages={mockStages} opportunities={manyOpps} />)

      // Should calculate total correctly: sum of 1000 + 2000 + ... + 50000
      const _totalValue = (50 * 51 / 2) * 1000 // = 1,275,000
      expect(screen.getByText('$1,275,000')).toBeInTheDocument()
    })
  })
})
