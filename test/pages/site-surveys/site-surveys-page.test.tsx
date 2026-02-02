import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SiteSurveysPage from '@/app/(dashboard)/site-surveys/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/site-surveys',
}))

// Mock the auth hook
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    user: null,
    profile: null,
    organization: { id: 'org-123' },
    isLoading: false,
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}))

// Mock the survey filters component
vi.mock('@/app/(dashboard)/site-surveys/survey-filters', () => ({
  SurveyFilters: () => <div data-testid="survey-filters">Filters</div>,
}))

// Mock the CreateSurveyButton component
vi.mock('@/app/(dashboard)/site-surveys/create-survey-modal', () => ({
  CreateSurveyButton: () => <button data-testid="create-survey-button">New Survey</button>,
}))

// Mock the survey status badge
vi.mock('@/components/surveys/survey-status-badge', () => ({
  SurveyStatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
  HazardTypeBadge: ({ hazardType }: { hazardType: string }) => <span data-testid="hazard-badge">{hazardType}</span>,
}))

describe('SiteSurveysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(() => render(<SiteSurveysPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<SiteSurveysPage />)
    expect(screen.getByText('Site Surveys')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<SiteSurveysPage />)
    expect(screen.getByText('Manage and review site survey assessments')).toBeInTheDocument()
  })

  it('displays mobile survey link', async () => {
    render(<SiteSurveysPage />)
    expect(await screen.findByRole('link', { name: /mobile survey/i })).toBeInTheDocument()
  })

  it('displays stats cards', async () => {
    render(<SiteSurveysPage />)
    expect(await screen.findByText('Total')).toBeInTheDocument()
    expect(await screen.findByText('Scheduled')).toBeInTheDocument()
    expect(await screen.findByText('In Progress')).toBeInTheDocument()
  })

  it('displays empty state when no surveys', async () => {
    render(<SiteSurveysPage />)
    expect(await screen.findByText('No surveys yet')).toBeInTheDocument()
  })

  it('displays survey filters', async () => {
    render(<SiteSurveysPage />)
    expect(await screen.findByTestId('survey-filters')).toBeInTheDocument()
  })

  it('displays create survey button', async () => {
    render(<SiteSurveysPage />)
    // Multiple create-survey-buttons may exist (in header and empty state)
    const buttons = await screen.findAllByTestId('create-survey-button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
