import { describe, it, expect, vi } from 'vitest'
import { redirect } from 'next/navigation'
import HomePage from '@/app/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('HomePage', () => {
  it('redirects to login page', () => {
    HomePage()
    expect(redirect).toHaveBeenCalledWith('/login')
  })
})
