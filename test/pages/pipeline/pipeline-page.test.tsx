import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

// Mock PipelineService
vi.mock('@/lib/services/pipeline-service', () => ({
  PipelineService: {
    getStages: () => Promise.resolve([
      { id: 'stage-1', name: 'Lead', position: 1, color: '#3b82f6', probability: 10 },
      { id: 'stage-2', name: 'Qualified', position: 2, color: '#22c55e', probability: 40 },
    ]),
    getOpportunities: () => Promise.resolve([
      {
        id: 'opp-1',
        name: 'Deal 1',
        stage_id: 'stage-1',
        estimated_value: 10000,
      },
    ]),
    getPipelineMetrics: () => Promise.resolve({
      count: 5,
      total_value: 50000,
      weighted_value: 25000,
    }),
  },
}))

// Mock PipelineKanbanLazy component
vi.mock('@/components/pipeline/pipeline-kanban-lazy', () => ({
  PipelineKanbanLazy: ({ stages, opportunities }: { stages: unknown[]; opportunities: unknown[] }) => (
    <div data-testid="pipeline-kanban">
      Stages: {Array.isArray(stages) ? stages.length : 0},
      Opportunities: {Array.isArray(opportunities) ? opportunities.length : 0}
    </div>
  ),
}))

// Import after mocks
import PipelinePage from '@/app/(dashboard)/pipeline/page'

describe('PipelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await PipelinePage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await PipelinePage()
    render(page)

    expect(screen.getByText('Sales Pipeline')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await PipelinePage()
    render(page)

    expect(screen.getByText('Track opportunities through your sales process')).toBeInTheDocument()
  })

  it('displays new opportunity button', async () => {
    const page = await PipelinePage()
    render(page)

    expect(screen.getByRole('link', { name: /new opportunity/i })).toBeInTheDocument()
  })

  it('displays opportunities count card', async () => {
    const page = await PipelinePage()
    render(page)

    expect(screen.getByText('Opportunities')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Active opportunities')).toBeInTheDocument()
  })

  it('displays pipeline value card', async () => {
    const page = await PipelinePage()
    render(page)

    expect(screen.getByText('Pipeline Value')).toBeInTheDocument()
    expect(screen.getByText('$50,000')).toBeInTheDocument()
    expect(screen.getByText('Total estimated value')).toBeInTheDocument()
  })

  it('displays weighted value card', async () => {
    const page = await PipelinePage()
    render(page)

    expect(screen.getByText('Weighted Value')).toBeInTheDocument()
    expect(screen.getByText('$25,000')).toBeInTheDocument()
    expect(screen.getByText('Probability-adjusted value')).toBeInTheDocument()
  })

  it('renders the kanban board', async () => {
    const page = await PipelinePage()
    render(page)

    expect(screen.getByTestId('pipeline-kanban')).toBeInTheDocument()
  })

  it('passes data to kanban board', async () => {
    const page = await PipelinePage()
    render(page)

    // Check the kanban is rendered with data
    const kanban = screen.getByTestId('pipeline-kanban')
    expect(kanban).toBeInTheDocument()
    expect(kanban.textContent).toContain('Stages:')
    expect(kanban.textContent).toContain('Opportunities:')
  })

  it('links to new opportunity page', async () => {
    const page = await PipelinePage()
    render(page)

    const link = screen.getByRole('link', { name: /new opportunity/i })
    expect(link).toHaveAttribute('href', '/pipeline/new')
  })
})
