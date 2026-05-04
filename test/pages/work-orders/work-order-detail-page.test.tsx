import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Suspense, type ReactElement } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { WorkOrderSnapshot } from '@/types/work-orders'
import WorkOrderDetailPage from '@/app/(dashboard)/work-orders/[id]/page'

const toastFn = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

vi.mock('@/lib/hooks/use-work-order-documents', () => ({
  useWorkOrderDocuments: () => ({ data: [], isLoading: false, error: null }),
  useUploadWorkOrderDocument: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteWorkOrderDocument: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

const snapshot: WorkOrderSnapshot = {
  version: 1,
  site: {
    address: '100 Site Rd',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    gate_code: null,
    lockbox_code: null,
    contact_onsite_name: null,
    contact_onsite_phone: null,
  },
  job: {
    id: 'job-1',
    job_number: 'JOB-9',
    name: 'Abatement',
    scheduled_start_date: '2026-03-01',
    scheduled_start_time: null,
    scheduled_end_date: null,
    estimated_duration_hours: 8,
    hazard_types: ['asbestos'],
    access_notes: null,
    special_instructions: null,
    site_survey_id: null,
  },
  customer: {
    id: 'cust-1',
    name: 'Pat Lee',
    company_name: 'Lee LLC',
    email: null,
    phone: '555-0101',
  },
  estimate: null,
  crew: [],
  equipment: [],
  materials: [],
  extra_items: [],
}

const workOrderPayload = {
  work_order: {
    id: 'wo-1',
    organization_id: 'org-123',
    job_id: 'job-1',
    work_order_number: 'WO-9001',
    status: 'draft' as const,
    snapshot,
    notes: null,
    issued_at: null,
    issued_by: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    job: { id: 'job-1', job_number: 'JOB-9', name: 'Abatement' },
    vehicles: [],
  },
  surveyMedia: [],
}

const mockFetch = vi.fn()
global.fetch = mockFetch

async function renderWithParams(ui: ReactElement) {
  let result: ReturnType<typeof render>
  await act(async () => {
    result = render(<Suspense fallback={null}>{ui}</Suspense>)
  })
  return result!
}

describe('WorkOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders work order number and draft actions after load', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(workOrderPayload),
    })

    await renderWithParams(<WorkOrderDetailPage params={Promise.resolve({ id: 'wo-1' })} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'WO-9001' })).toBeInTheDocument()
    })
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /issue work order/i })).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith('/api/work-orders/wo-1')
  })

  it('toasts when work order fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })

    await renderWithParams(<WorkOrderDetailPage params={Promise.resolve({ id: 'wo-missing' })} />)

    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not load work order',
          variant: 'destructive',
        }),
      )
    })
    expect(screen.getByText('WorkOrder not found.')).toBeInTheDocument()
  })
})
