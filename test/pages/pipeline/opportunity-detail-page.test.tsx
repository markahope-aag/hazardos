import { describe, it, expect, vi } from 'vitest'
import { redirect } from 'next/navigation'
import OpportunityRedirect from '@/app/(dashboard)/pipeline/[id]/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('OpportunityDetailPage', () => {
  it('redirects to /crm/opportunities/:id', async () => {
    await OpportunityRedirect({ params: Promise.resolve({ id: 'opp-123' }) })
    expect(redirect).toHaveBeenCalledWith('/crm/opportunities/opp-123')
  })
})
