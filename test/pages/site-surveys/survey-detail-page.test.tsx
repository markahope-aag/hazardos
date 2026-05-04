import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { SiteSurvey } from '@/types/database'
import SurveyDetailPage from '@/app/(dashboard)/site-surveys/[id]/page'

const routerStub = { push: vi.fn(), refresh: vi.fn() }
const paramsStub = { id: 'survey-1' }

vi.mock('next/navigation', () => ({
  useParams: () => paramsStub,
  useRouter: () => routerStub,
  usePathname: () => '/site-surveys/survey-1',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'org-123' },
    profile: { role: 'tenant_owner' },
  }),
}))

const toastFn = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

const minimalSurvey: SiteSurvey = {
  id: 'survey-1',
  organization_id: 'org-123',
  estimator_id: null,
  customer_id: 'cust-1',
  property_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  job_name: '123 Oak inspection',
  customer_name: 'Jane Customer',
  customer_email: 'jane@example.com',
  customer_phone: '555-0199',
  site_address: '123 Oak St',
  site_city: 'Dallas',
  site_state: 'TX',
  site_zip: '75201',
  site_location: null,
  hazard_type: 'asbestos',
  hazard_subtype: null,
  containment_level: null,
  area_sqft: null,
  linear_ft: null,
  volume_cuft: null,
  material_type: null,
  occupied: false,
  access_issues: null,
  special_conditions: null,
  clearance_required: false,
  clearance_lab: null,
  regulatory_notifications_needed: false,
  notes: null,
  status: 'submitted',
  scheduled_date: '2026-02-01',
  scheduled_time_start: null,
  scheduled_time_end: null,
  assigned_to: null,
  appointment_status: null,
  building_type: null,
  year_built: null,
  building_sqft: null,
  stories: null,
  construction_type: null,
  occupancy_status: null,
  owner_name: null,
  owner_phone: null,
  owner_email: null,
  access_info: null,
  environment_info: null,
  hazard_assessments: null,
  photo_metadata: null,
  technician_notes: null,
  started_at: null,
  submitted_at: null,
  cancellation_reason: null,
  cancelled_at: null,
  cancelled_by: null,
  parent_survey_id: null,
  survey_root_id: 'root-survey-1',
  version: 1,
  revision_notes: null,
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: minimalSurvey, error: null }),
          }),
        }),
      }),
    }),
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SurveyDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/estimates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ estimates: [] }),
        })
      }
      if (url.includes('/versions')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_info: { version: 1, total: 1, root_id: 'root-survey-1' },
              chain: [],
            }),
        })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
  })

  it('renders survey header and back link', async () => {
    render(<SurveyDetailPage />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back to surveys/i })).toHaveAttribute(
        'href',
        '/site-surveys',
      )
    })
    expect(screen.getByRole('heading', { name: 'Jane Customer' })).toBeInTheDocument()
    expect(screen.getByText(/123 Oak St,\s*Dallas,\s*TX\s*75201/)).toBeInTheDocument()
  })
})
