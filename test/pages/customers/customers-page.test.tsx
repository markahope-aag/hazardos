import { describe, it, expect, vi } from 'vitest'
import { redirect } from 'next/navigation'
import CustomersPage from '@/app/(dashboard)/customers/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('CustomersPage', () => {
  it('redirects to /crm/contacts', () => {
    CustomersPage()
    expect(redirect).toHaveBeenCalledWith('/crm/contacts')
  })
})
