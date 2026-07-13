import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import { render, screen } from '@testing-library/react'
import JobReviewPage from '@/app/(dashboard)/jobs/[id]/review/page'

/**
 * J12: variance analysis should be visible right after a technician
 * submits a completion, not only reachable via a separate admin click.
 * The submitting technician is now redirected straight to this page, so
 * it must render the variance summary for them too - but the
 * approve/reject actions must stay admin-only (the API already enforces
 * this; the page should match instead of showing buttons that 403).
 */

const mockJob = {
  id: 'job-1',
  job_number: 'JOB-REVIEW-TEST-1',
  name: 'Test job',
  customer: { id: 'cust-1', name: 'Test Customer', company_name: null },
  completion: {
    id: 'completion-1',
    status: 'submitted',
    submitted_at: '2026-07-13T10:00:00.000Z',
    submitter: { id: 'user-1', full_name: 'Jane Tech' },
    reviewer: null,
    estimated_hours: 10,
    hours_variance_percent: 20,
    estimated_total: 500,
    cost_variance_percent: -5,
    field_notes: null,
    issues_encountered: null,
    recommendations: null,
  },
}

const getCurrentProfileMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentProfile: getCurrentProfileMock,
}))

vi.mock('@/app/(dashboard)/jobs/[id]/review/review-actions', () => ({
  CompletionReviewActions: () => <div data-testid="review-actions">Approve / Reject</div>,
}))

function chain(result: { data: unknown; error: null }) {
  const handler: Record<string, unknown> = {}
  const self = () => handler
  for (const m of ['select', 'eq', 'order']) handler[m] = self
  handler.single = () => Promise.resolve(result)
  ;(handler as { then: (fn: (v: typeof result) => unknown) => unknown }).then = (onFulfilled) =>
    Promise.resolve(result).then(onFulfilled)
  return handler
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'jobs') return chain({ data: mockJob, error: null })
      return chain({ data: [], error: null })
    }),
  }),
}))

async function renderPage() {
  const ui = (await JobReviewPage({
    params: Promise.resolve({ id: 'job-1' }),
  })) as React.ReactElement
  return render(ui)
}

describe('JobReviewPage', () => {
  it('shows the variance summary for the submitting technician (non-admin)', async () => {
    getCurrentProfileMock.mockResolvedValue({ id: 'user-1', role: 'technician' })

    await renderPage()

    expect(screen.getByText('Variance Summary')).toBeInTheDocument()
    expect(screen.getByText('10.0')).toBeInTheDocument() // Est. Hours
    expect(screen.getByText(/awaiting office review/i)).toBeInTheDocument()
    expect(screen.queryByTestId('review-actions')).not.toBeInTheDocument()
  })

  it('shows approve/reject actions for an admin reviewer', async () => {
    getCurrentProfileMock.mockResolvedValue({ id: 'user-2', role: 'admin' })

    await renderPage()

    expect(screen.getByText('Variance Summary')).toBeInTheDocument()
    expect(screen.getByTestId('review-actions')).toBeInTheDocument()
    expect(screen.queryByText(/awaiting office review/i)).not.toBeInTheDocument()
  })
})
