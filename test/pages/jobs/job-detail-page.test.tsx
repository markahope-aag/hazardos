import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import { render, screen } from '@testing-library/react'
import type { Job } from '@/types/jobs'
import JobDetailPage from '@/app/(dashboard)/jobs/[id]/page'

const minimalJob: Job = {
  id: 'job-1',
  organization_id: 'org-123',
  proposal_id: null,
  estimate_id: null,
  customer_id: 'cust-1',
  site_survey_id: null,
  job_number: 'JOB-TEST-1',
  name: 'Smoke job',
  status: 'scheduled',
  hazard_types: [],
  scheduled_start_date: '2026-01-15',
  scheduled_start_time: null,
  scheduled_end_date: null,
  scheduled_end_time: null,
  estimated_duration_hours: 4,
  actual_start_at: null,
  actual_end_at: null,
  job_address: '100 Test Lane',
  job_city: 'Austin',
  job_state: 'TX',
  job_zip: '78701',
  job_latitude: null,
  job_longitude: null,
  access_notes: null,
  gate_code: null,
  lockbox_code: null,
  contact_onsite_name: null,
  contact_onsite_phone: null,
  contract_amount: null,
  change_order_amount: 0,
  final_amount: null,
  completion_notes: null,
  completion_photos: [],
  customer_signed_off: false,
  customer_signoff_at: null,
  customer_signoff_name: null,
  inspection_required: false,
  inspection_passed: null,
  inspection_date: null,
  inspection_notes: null,
  internal_notes: null,
  special_instructions: null,
  created_by: 'user-123',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function defaultEmbedBuilder() {
  const b: Record<string, unknown> = {}
  const chain = () => b
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte'] as const) {
    b[m] = chain
  }
  b.limit = () => ({
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  })
  b.single = () => Promise.resolve({ data: null, error: null })
  b.maybeSingle = () => Promise.resolve({ data: null, error: null })
  ;(b as { then: (fn: (v: { data: unknown[]; error: null }) => unknown) => unknown }).then = (onFulfilled) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled)
  return b
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        const b: Record<string, unknown> = {}
        const chain = () => b
        b.select = chain
        b.eq = chain
        b.single = () => Promise.resolve({ data: minimalJob, error: null })
        return b
      }
      return defaultEmbedBuilder()
    }),
  }),
}))

async function renderPage() {
  const ui = (await JobDetailPage({
    params: Promise.resolve({ id: 'job-1' }),
  })) as React.ReactElement
  return render(ui)
}

describe('JobDetailPage', () => {
  it('renders job number and primary tabs', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'JOB-TEST-1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /crew/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /work order/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /activity/i })).toBeInTheDocument()
  })
})
