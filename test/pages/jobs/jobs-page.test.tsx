import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import { render, screen } from '@testing-library/react'
import JobsPage from '@/app/(dashboard)/jobs/page'

/** Thenable Supabase-style builder: `await .from().select()...` → `{ data, error }`. */
function jobsListQueryBuilder(data: unknown[]) {
  const b: Record<string, unknown> = {}
  const self = () => b
  for (const m of ['select', 'eq', 'gte', 'lte', 'order'] as const) {
    b[m] = self
  }
  ;(b as { then: (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) => unknown }).then = (
    onFulfilled: (v: { data: unknown[]; error: null }) => unknown,
  ) => Promise.resolve({ data, error: null }).then(onFulfilled)
  return b
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => jobsListQueryBuilder([])),
  }),
}))

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = (await JobsPage({
    searchParams: Promise.resolve(searchParams),
  })) as React.ReactElement
  return render(ui)
}

describe('JobsPage (dashboard index)', () => {
  it('renders heading and empty table copy', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument()
    expect(screen.getByText('Manage scheduled and completed jobs')).toBeInTheDocument()
    expect(screen.getByText('No jobs found')).toBeInTheDocument()
  })

  it('links to new job and calendar', async () => {
    await renderPage()
    expect(screen.getByRole('link', { name: /new job/i })).toHaveAttribute('href', '/jobs/new')
    expect(screen.getByRole('link', { name: /calendar view/i })).toHaveAttribute('href', '/calendar')
  })
})
