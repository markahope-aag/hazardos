import { describe, it, expect, vi } from 'vitest'
import { redirect } from 'next/navigation'
import CustomerDetailRedirect from '@/app/(dashboard)/customers/[id]/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('CustomerDetailPage', () => {
  it('redirects to /crm/contacts/:id', async () => {
    await CustomerDetailRedirect({ params: Promise.resolve({ id: 'test-id-123' }) })
    expect(redirect).toHaveBeenCalledWith('/crm/contacts/test-id-123')
  })
})
