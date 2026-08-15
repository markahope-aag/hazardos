import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { EstimateWithRelations } from '@/types/estimates'
import EstimateDetailPage from '@/app/(dashboard)/estimates/[id]/page'

const routerStub = { push: vi.fn(), refresh: vi.fn() }
const paramsStub = { id: 'estimate-1' }

vi.mock('next/navigation', () => ({
  useParams: () => paramsStub,
  useRouter: () => routerStub,
  usePathname: () => '/estimates/estimate-1',
  useSearchParams: () => new URLSearchParams(),
}))

const toastFn = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

let mockProfile: { role: string } | null = { role: 'admin' }
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'org-123' },
    profile: mockProfile,
  }),
}))

// Heavy child components: mock to isolate this page's own orchestration.
vi.mock('@/components/estimates/survey-review-modal', () => ({
  SurveyReviewModal: () => null,
}))
vi.mock('@/components/estimates/credentials-picker', () => ({
  CredentialsPicker: () => <div data-testid="credentials-picker" />,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

function baseEstimate(overrides: Partial<EstimateWithRelations> = {}): EstimateWithRelations {
  return {
    id: 'estimate-1',
    organization_id: 'org-123',
    site_survey_id: null,
    customer_id: 'cust-1',
    estimate_number: 'EST-1001',
    version: 1,
    parent_estimate_id: null,
    estimate_root_id: 'estimate-1',
    revision_notes: null,
    is_active: true,
    status: 'draft',
    subtotal: 1000,
    markup_percent: 0,
    markup_amount: 0,
    discount_percent: 0,
    discount_amount: 0,
    tax_percent: 0,
    tax_amount: 0,
    total: 1000,
    project_name: 'Oak St Remediation',
    project_description: null,
    scope_of_work: null,
    estimated_duration_days: null,
    estimated_start_date: null,
    estimated_end_date: null,
    valid_until: null,
    approved_by: null,
    approved_at: null,
    approval_notes: null,
    internal_notes: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    customer: {
      id: 'cust-1',
      name: 'Jane Customer',
      company_name: null,
      first_name: 'Jane',
      last_name: 'Customer',
      email: 'jane@example.com',
      phone: null,
      mobile_phone: '555-0199',
      office_phone: null,
    },
    site_survey: null,
    line_items: [
      {
        id: 'li-1',
        estimate_id: 'estimate-1',
        item_type: 'labor',
        category: null,
        description: 'Removal labor',
        quantity: 10,
        unit: 'hr',
        unit_price: 100,
        total_price: 1000,
        source_rate_id: null,
        source_table: null,
        sort_order: 0,
        is_optional: false,
        is_included: true,
        notes: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    proposals: [],
    ...overrides,
  }
}

// The page always fetches by the route param (paramsStub.id), regardless of
// what id the returned estimate payload carries (relevant for the version
// history tests, where the active version in the chain has a different id).
function mockEstimateFetch(estimate: EstimateWithRelations, versionInfo?: object) {
  mockFetch.mockImplementation((url: string) => {
    if (url === `/api/estimates/${paramsStub.id}`) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            estimate,
            version_info: versionInfo ?? {
              version: 1,
              total: 1,
              root_id: estimate.estimate_root_id,
              chain: [],
            },
          }),
      })
    }
    if (url === `/api/estimates/${paramsStub.id}/approval`) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ approval_request: null }),
      })
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
  })
}

describe('EstimateDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfile = { role: 'admin' }
  })

  it('renders without crashing with a realistic estimate payload', async () => {
    mockEstimateFetch(baseEstimate())
    render(<EstimateDetailPage />)
    expect(await screen.findByText('EST-1001')).toBeInTheDocument()
    // "Jane Customer" appears in both the header and the Customer card.
    expect(screen.getAllByText('Jane Customer').length).toBeGreaterThan(0)
    expect(screen.getByText('Removal labor')).toBeInTheDocument()
  })

  it('shows a loading spinner before data arrives', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    const { container } = render(<EstimateDetailPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows not-found state and redirects when the estimate 404s', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/estimates/estimate-1') {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
    })
    render(<EstimateDetailPage />)
    await waitFor(() => expect(routerStub.push).toHaveBeenCalledWith('/estimates'))
    expect(await screen.findByText('Estimate not found')).toBeInTheDocument()
  })

  it('shows error state when the fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))
    render(<EstimateDetailPage />)
    expect(await screen.findByText('Estimate not found')).toBeInTheDocument()
    expect(toastFn).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error' }),
    )
  })

  it('shows the version badge and version history table when the chain has multiple entries', async () => {
    const estimate = baseEstimate({ id: 'estimate-2', is_active: true })
    mockEstimateFetch(estimate, {
      version: 2,
      total: 2,
      root_id: 'estimate-1',
      chain: [
        {
          id: 'estimate-1',
          version: 1,
          status: 'draft',
          created_at: '2026-01-01T00:00:00.000Z',
          total: 900,
          estimate_number: 'EST-1000',
          revision_notes: null,
          created_by: null,
          is_active: false,
        },
        {
          id: 'estimate-2',
          version: 2,
          status: 'draft',
          created_at: '2026-01-02T00:00:00.000Z',
          total: 1000,
          estimate_number: 'EST-1001',
          revision_notes: 'Updated pricing',
          created_by: null,
          is_active: true,
        },
      ],
    })
    render(<EstimateDetailPage />)
    expect(await screen.findByText('Version 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Version History')).toBeInTheDocument()
    // Active version row shows the "Active" badge, not a "Mark active" button.
    // "Active" also appears as the table column header, so there are two matches.
    expect(screen.getAllByText('Active').length).toBe(2)
    // The inactive (v1) row shows a "Mark active" button instead.
    expect(screen.getByRole('button', { name: /mark active/i })).toBeInTheDocument()
    // No "not the active version" banner since the current estimate is active.
    expect(screen.queryByText('Not the active version')).not.toBeInTheDocument()
  })

  it('shows the "not the active version" banner when viewing an inactive version', async () => {
    const estimate = baseEstimate({ id: 'estimate-1', is_active: false })
    mockEstimateFetch(estimate, {
      version: 1,
      total: 2,
      root_id: 'estimate-1',
      chain: [
        {
          id: 'estimate-1',
          version: 1,
          status: 'draft',
          created_at: '2026-01-01T00:00:00.000Z',
          total: 900,
          estimate_number: 'EST-1000',
          revision_notes: null,
          created_by: null,
          is_active: false,
        },
        {
          id: 'estimate-2',
          version: 2,
          status: 'draft',
          created_at: '2026-01-02T00:00:00.000Z',
          total: 1000,
          estimate_number: 'EST-1001',
          revision_notes: null,
          created_by: null,
          is_active: true,
        },
      ],
    })
    render(<EstimateDetailPage />)
    expect(await screen.findByText('Not the active version')).toBeInTheDocument()
    expect(screen.getByText(/The active version is 2\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view active version/i })).toBeInTheDocument()
  })

  it('shows "Submit for Approval" for a draft estimate', async () => {
    mockEstimateFetch(baseEstimate({ status: 'draft' }))
    render(<EstimateDetailPage />)
    expect(await screen.findByRole('button', { name: /submit for approval/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve & forward/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create proposal/i })).not.toBeInTheDocument()
  })

  it('shows review actions for a pending_approval estimate when the admin can review', async () => {
    const estimate = baseEstimate({ status: 'pending_approval' })
    mockFetch.mockImplementation((url: string) => {
      if (url === `/api/estimates/${estimate.id}`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              estimate,
              version_info: { version: 1, total: 1, root_id: estimate.id, chain: [] },
            }),
        })
      }
      if (url === `/api/estimates/${estimate.id}/approval`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              approval_request: {
                id: 'appr-1',
                requested_by: 'user-1',
                level1_status: 'pending',
                level1_notes: null,
                level1_at: null,
                requires_level2: false,
                level2_status: null,
                level2_notes: null,
                level2_at: null,
                final_status: 'pending',
              },
            }),
        })
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
    })
    render(<EstimateDetailPage />)
    expect(await screen.findByRole('button', { name: /approve & forward/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send back for changes/i })).toBeInTheDocument()
    expect(
      screen.getByText(/Awaiting office manager review/i),
    ).toBeInTheDocument()
  })

  it('shows "Create Proposal" for an approved estimate and hides the edit menu', async () => {
    mockEstimateFetch(baseEstimate({ status: 'approved' }))
    render(<EstimateDetailPage />)
    expect(await screen.findByRole('link', { name: /create proposal/i })).toBeInTheDocument()
    // canEdit is only true for draft/pending_approval, so no Edit dropdown.
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })

  it('shows the Edit dropdown for a draft estimate (editable status)', async () => {
    mockEstimateFetch(baseEstimate({ status: 'draft' }))
    render(<EstimateDetailPage />)
    await screen.findByText('EST-1001')
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })

  it('does not show review actions for a pending_approval estimate when the role cannot review', async () => {
    mockProfile = { role: 'technician' }
    const estimate = baseEstimate({ status: 'pending_approval' })
    mockFetch.mockImplementation((url: string) => {
      if (url === `/api/estimates/${estimate.id}`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              estimate,
              version_info: { version: 1, total: 1, root_id: estimate.id, chain: [] },
            }),
        })
      }
      if (url === `/api/estimates/${estimate.id}/approval`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              approval_request: {
                id: 'appr-1',
                requested_by: 'user-1',
                level1_status: 'pending',
                level1_notes: null,
                level1_at: null,
                requires_level2: false,
                level2_status: null,
                level2_notes: null,
                level2_at: null,
                final_status: 'pending',
              },
            }),
        })
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
    })
    render(<EstimateDetailPage />)
    await screen.findByText('EST-1001')
    expect(screen.queryByRole('button', { name: /approve & forward/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send back for changes/i })).not.toBeInTheDocument()
  })
})
