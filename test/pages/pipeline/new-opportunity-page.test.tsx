import { describe, it, expect, vi } from 'vitest'
import { redirect } from 'next/navigation'
import NewOpportunityRedirect from '@/app/(dashboard)/pipeline/new/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('NewOpportunityPage', () => {
  it('redirects to /crm/opportunities/new', () => {
    NewOpportunityRedirect()
    expect(redirect).toHaveBeenCalledWith('/crm/opportunities/new')
  })
})
