import { render, screen, fireEvent } from '@testing-library/react'
import { PipelineFilters, EMPTY_PIPELINE_FILTERS, type PipelineFilterState } from '@/components/pipeline/pipeline-filters'
import type { PipelineStage } from '@/types/sales'

// The sales-user dropdown is populated from useOrgMembers; mock it so the
// filter renders a known list without a live Supabase query.
vi.mock('@/lib/hooks/use-org-members', () => ({
  useOrgMembers: () => ({
    data: [
      { id: 'user_001', first_name: 'Alice', last_name: 'Owner', email: 'alice@example.com' },
      { id: 'user_002', first_name: 'Bob', last_name: 'Rep', email: 'bob@example.com' },
    ],
    isLoading: false,
  }),
}))

const stages: PipelineStage[] = [
  {
    id: 'stage_lead', organization_id: 'org_1', name: 'Lead', color: '#000',
    stage_type: 'lead', probability: 10, sort_order: 1, is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'stage_won', organization_id: 'org_1', name: 'Won', color: '#0f0',
    stage_type: 'won', probability: 100, sort_order: 2, is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

describe('PipelineFilters (PA4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits the picked date range through onChange', () => {
    const onChange = vi.fn()
    render(<PipelineFilters stages={stages} value={EMPTY_PIPELINE_FILTERS} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-02-01' } })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2024-02-01' })
    )
  })

  it('adds a stage id to the set when its checkbox is toggled on', () => {
    const onChange = vi.fn()
    render(<PipelineFilters stages={stages} value={EMPTY_PIPELINE_FILTERS} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /all stages/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Won' }))

    const next = onChange.mock.calls[0][0] as PipelineFilterState
    expect(next.stageIds.has('stage_won')).toBe(true)
  })

  it('shows the Reset button only when a filter is active', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <PipelineFilters stages={stages} value={EMPTY_PIPELINE_FILTERS} onChange={onChange} />
    )

    expect(screen.queryByRole('button', { name: /reset filters/i })).not.toBeInTheDocument()

    rerender(
      <PipelineFilters
        stages={stages}
        value={{ ...EMPTY_PIPELINE_FILTERS, ownerId: 'user_001' }}
        onChange={onChange}
      />
    )

    const resetButton = screen.getByRole('button', { name: /reset filters/i })
    fireEvent.click(resetButton)
    expect(onChange).toHaveBeenCalledWith(EMPTY_PIPELINE_FILTERS)
  })

  it('reflects the active stage count in the trigger label', () => {
    const onChange = vi.fn()
    render(
      <PipelineFilters
        stages={stages}
        value={{ ...EMPTY_PIPELINE_FILTERS, stageIds: new Set(['stage_lead', 'stage_won']) }}
        onChange={onChange}
      />
    )

    expect(screen.getByRole('button', { name: /2 stages/i })).toBeInTheDocument()
  })
})
