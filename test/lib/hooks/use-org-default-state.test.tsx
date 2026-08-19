import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOrgDefaultState } from '@/lib/hooks/use-org-default-state'

const mockAuth = vi.fn()
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => mockAuth(),
}))

/**
 * Gina asked for the state to default to WI. It reads the organization's own
 * state instead of hardcoding it, so AHS get WI and the next tenant gets
 * theirs without anyone configuring anything.
 */
describe('useOrgDefaultState', () => {
  beforeEach(() => mockAuth.mockReset())

  it('returns the organization state, which is WI for AHS', () => {
    mockAuth.mockReturnValue({ organization: { state: 'WI' } })
    expect(renderHook(() => useOrgDefaultState()).result.current).toBe('WI')
  })

  it('gives a different tenant their own state, not WI', () => {
    mockAuth.mockReturnValue({ organization: { state: 'CO' } })
    expect(renderHook(() => useOrgDefaultState()).result.current).toBe('CO')
  })

  it('uppercases a lowercase code', () => {
    mockAuth.mockReturnValue({ organization: { state: 'wi' } })
    expect(renderHook(() => useOrgDefaultState()).result.current).toBe('WI')
  })

  it('returns blank for an organization with no state', () => {
    mockAuth.mockReturnValue({ organization: { state: null } })
    expect(renderHook(() => useOrgDefaultState()).result.current).toBe('')
  })

  it('returns blank before the organization has loaded', () => {
    mockAuth.mockReturnValue({ organization: null })
    expect(renderHook(() => useOrgDefaultState()).result.current).toBe('')
  })

  // Truncating "Wisconsin" to "Wi" would be a guess, and quietly pre-filling
  // the wrong state on a regulatory form is worse than leaving it blank.
  it('refuses to guess from a full state name', () => {
    mockAuth.mockReturnValue({ organization: { state: 'Wisconsin' } })
    expect(renderHook(() => useOrgDefaultState()).result.current).toBe('')
  })
})
