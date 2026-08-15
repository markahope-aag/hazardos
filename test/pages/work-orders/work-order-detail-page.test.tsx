import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WorkOrderSnapshot, WorkOrderStatus, WorkOrderVehicle } from '@/types/work-orders'
import WorkOrderDetailPage from '@/app/(dashboard)/work-orders/[id]/page'

const toastFn = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

vi.mock('@/lib/services/photo-upload-service', () => ({
  getSignedSurveyMediaUrls: vi.fn().mockResolvedValue({}),
}))

// Heavy child component with its own data hooks, mocked so this test
// exercises only the detail page's own orchestration.
vi.mock('@/app/(dashboard)/work-orders/[id]/work-order-documents', () => ({
  WorkOrderDocuments: ({ workOrderId }: { workOrderId: string }) => (
    <div data-testid="work-order-documents">{workOrderId}</div>
  ),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

function buildSnapshot(overrides: Partial<WorkOrderSnapshot> = {}): WorkOrderSnapshot {
  return {
    version: 1,
    site: {
      address: '100 Test Lane',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      gate_code: null,
      lockbox_code: null,
      contact_onsite_name: null,
      contact_onsite_phone: null,
    },
    job: {
      id: 'job-1',
      job_number: 'JOB-1',
      name: 'Asbestos removal',
      scheduled_start_date: '2026-02-01',
      scheduled_start_time: '08:00',
      scheduled_end_date: null,
      estimated_duration_hours: 4,
      hazard_types: ['asbestos'],
      access_notes: null,
      special_instructions: null,
      site_survey_id: null,
    },
    customer: null,
    estimate: null,
    crew: [],
    equipment: [],
    materials: [],
    extra_items: [],
    ...overrides,
  }
}

const vehicles: WorkOrderVehicle[] = []

function buildWorkOrder(status: WorkOrderStatus, snapshotOverrides: Partial<WorkOrderSnapshot> = {}) {
  return {
    id: 'wo-1',
    organization_id: 'org-123',
    job_id: 'job-1',
    work_order_number: 'WO-1001',
    status,
    snapshot: buildSnapshot(snapshotOverrides),
    notes: '',
    issued_at: null,
    issued_by: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    job: { id: 'job-1', job_number: 'JOB-1', name: 'Asbestos removal' },
    vehicles,
  }
}

function mockLoadResponse(status: WorkOrderStatus, snapshotOverrides: Partial<WorkOrderSnapshot> = {}) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      work_order: buildWorkOrder(status, snapshotOverrides),
      surveyMedia: [],
    }),
  })
}

// The page unwraps `params` with React's `use()`. A plain Promise hasn't
// settled by the time `use()` first reads it, so it suspends the render —
// which then needs a Suspense boundary and an extra microtask tick to
// resolve, making every test flake on timing. Instead we hand `use()` an
// already-fulfilled thenable (the same shape React's internal thenable
// cache produces once a promise has settled), so it unwraps synchronously
// on the very first render.
function resolvedParams(id: string) {
  return {
    status: 'fulfilled',
    value: { id },
    then: () => {},
  } as unknown as Promise<{ id: string }>
}

function renderPage(id = 'wo-1') {
  return render(<WorkOrderDetailPage params={resolvedParams(id)} />)
}

describe('WorkOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the work order header, site, and job scope once loaded', async () => {
    mockLoadResponse('draft')
    renderPage()

    expect(await screen.findByRole('heading', { name: 'WO-1001' })).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('100 Test Lane')).toBeInTheDocument()
    expect(screen.getByText('Austin, TX, 78701')).toBeInTheDocument()
    expect(screen.getByText('Job scope')).toBeInTheDocument()
    expect(screen.getByText('Asbestos removal')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith('/api/work-orders/wo-1')
  })

  it('shows a loading spinner before the fetch resolves', async () => {
    let resolveFetch: (v: unknown) => void = () => {}
    mockFetch.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve }))

    const { container } = renderPage()

    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ work_order: buildWorkOrder('draft'), surveyMedia: [] }),
    })

    expect(await screen.findByRole('heading', { name: 'WO-1001' })).toBeInTheDocument()
  })

  it('shows a not-found state and toasts when the load request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    renderPage()

    expect(await screen.findByText('WorkOrder not found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to work orders/i })).toHaveAttribute(
      'href',
      '/work-orders',
    )
    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not load work order',
          variant: 'destructive',
        }),
      )
    })
  })

  it('renders crew, materials, equipment, vehicles, and extra item sections', async () => {
    mockLoadResponse('draft', {
      crew: [{ profile_id: null, name: 'Jane Crew', role: 'Lead', is_lead: true, scheduled_start: null, scheduled_end: null }],
      materials: [{ name: 'Poly sheeting', type: null, quantity_estimated: 10, unit: 'rolls', notes: null }],
      equipment: [{ name: 'HEPA vacuum', type: null, quantity: 2, is_rental: false, rental_start_date: null, rental_end_date: null, notes: null }],
      extra_items: [{ label: 'Extra signage', detail: null }],
    })
    renderPage()

    expect(await screen.findByText('Crew (1)')).toBeInTheDocument()
    expect(screen.getByText('Materials (1)')).toBeInTheDocument()
    expect(screen.getByText('Equipment (1)')).toBeInTheDocument()
    expect(screen.getByText('Vehicles (0)')).toBeInTheDocument()
    expect(screen.getByText('Additional items (1)')).toBeInTheDocument()
    expect(screen.getByTestId('work-order-documents')).toHaveTextContent('wo-1')
  })

  it('shows "Issue work order" for a draft and opens the confirm dialog', async () => {
    mockLoadResponse('draft')
    const user = userEvent.setup()
    renderPage()

    const issueButton = await screen.findByRole('button', { name: /issue work order/i })
    await user.click(issueButton)

    expect(screen.getByRole('alertdialog', { name: /issue this work order/i })).toBeInTheDocument()
  })

  it('shows "Mark complete" and "Re-issue" for a revised work order, and allows editing', async () => {
    mockLoadResponse('revised')
    renderPage()

    expect(await screen.findByText('Revised')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /re-issue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    // Editable sections show an "Add" affordance.
    expect(screen.getAllByRole('button', { name: /^add$/i }).length).toBeGreaterThan(0)
  })

  it('treats archived work orders as read-only: "Unarchive" shown, no Save/Add buttons', async () => {
    mockLoadResponse('archived')
    renderPage()

    expect(await screen.findByText('Archived')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /unarchive/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add vehicle/i })).not.toBeInTheDocument()
  })

  it('opens the email dialog and sends to entered recipients', async () => {
    mockLoadResponse('issued')
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'WO-1001' })
    await user.click(screen.getByRole('button', { name: /^email$/i }))
    expect(screen.getByRole('heading', { name: 'Email workOrder' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Recipients'), 'crew@example.com')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ recipients: 1 }),
    })
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/work-orders/wo-1/email',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'WorkOrder emailed' }),
      )
    })
  })
})
