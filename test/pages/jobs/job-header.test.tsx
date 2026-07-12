import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Job } from '@/types/jobs'
import { JobHeader } from '@/app/(dashboard)/jobs/[id]/job-header'

/**
 * J8: the materials/time/photos/checklist logging flow at
 * /jobs/[id]/complete exists in full but nothing in the app ever linked
 * to it. The only "Complete Job" control directly flipped job.status to
 * 'completed' via a confirm dialog, bypassing that flow entirely -- so
 * technicians had no way to log materials.
 *
 * Fix: when a job is in_progress, "Complete Job" now navigates to
 * /jobs/[id]/complete (the real logging + submit-for-review flow) instead
 * of opening the quick-toggle dialog.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const baseJob: Job = {
  id: 'job-1',
  organization_id: 'org-123',
  proposal_id: null,
  estimate_id: null,
  customer_id: 'cust-1',
  site_survey_id: null,
  job_number: 'JOB-TEST-1',
  name: 'Test job',
  status: 'in_progress',
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

describe('JobHeader', () => {
  it('links Complete Job to the full completion flow for an in-progress job', () => {
    render(<JobHeader job={baseJob} />)

    const completeLink = screen.getByRole('link', { name: /complete job/i })
    expect(completeLink).toHaveAttribute('href', '/jobs/job-1/complete')
  })

  it('does not show the quick status-toggle confirmation dialog', () => {
    render(<JobHeader job={baseJob} />)

    expect(screen.queryByText(/mark this job complete/i)).not.toBeInTheDocument()
  })

  it('shows Start Job for a scheduled job instead', () => {
    render(<JobHeader job={{ ...baseJob, status: 'scheduled' }} />)

    expect(screen.getByRole('button', { name: /start job/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /complete job/i })).not.toBeInTheDocument()
  })
})
