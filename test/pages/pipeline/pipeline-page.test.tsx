import { describe, it, expect, vi } from 'vitest'
import { redirect } from 'next/navigation'
import PipelinePage from '@/app/(dashboard)/pipeline/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('PipelinePage', () => {
  it('redirects to /crm/opportunities', () => {
    PipelinePage()
    expect(redirect).toHaveBeenCalledWith('/crm/opportunities')
  })
})
