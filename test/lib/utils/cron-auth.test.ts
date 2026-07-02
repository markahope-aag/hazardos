import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The rate limiter is exercised elsewhere; here we default it to "allow" and
// override per-test to prove the gate short-circuits on a 429.
const { applyUnifiedRateLimitMock } = vi.hoisted(() => ({
  applyUnifiedRateLimitMock: vi.fn(),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: applyUnifiedRateLimitMock,
}))

import { authorizeCronRequest } from '@/lib/utils/cron-auth'

const url = 'http://localhost:3000/api/cron/photo-lifecycle'

describe('authorizeCronRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyUnifiedRateLimitMock.mockResolvedValue(null)
    process.env.CRON_SECRET = 'test-secret-key'
  })

  it('authorizes a valid Bearer CRON_SECRET (returns null)', async () => {
    const request = new NextRequest(url, {
      headers: { authorization: 'Bearer test-secret-key' },
    })
    expect(await authorizeCronRequest(request)).toBeNull()
  })

  it('authorizes the Vercel-signed x-vercel-cron header (returns null)', async () => {
    const request = new NextRequest(url, { headers: { 'x-vercel-cron': '1' } })
    expect(await authorizeCronRequest(request)).toBeNull()
  })

  it('rejects a missing credential with 401', async () => {
    const request = new NextRequest(url)
    const response = await authorizeCronRequest(request)
    expect(response?.status).toBe(401)
  })

  it('rejects a wrong Bearer token with 401', async () => {
    const request = new NextRequest(url, {
      headers: { authorization: 'Bearer nope' },
    })
    const response = await authorizeCronRequest(request)
    expect(response?.status).toBe(401)
  })

  it('returns 500 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET
    const request = new NextRequest(url, {
      headers: { authorization: 'Bearer anything' },
    })
    const response = await authorizeCronRequest(request)
    expect(response?.status).toBe(500)
  })

  it('short-circuits with the rate-limit response before checking auth', async () => {
    const limited = new Response(null, { status: 429 }) as unknown
    applyUnifiedRateLimitMock.mockResolvedValueOnce(limited)
    const request = new NextRequest(url, {
      headers: { authorization: 'Bearer test-secret-key' },
    })
    expect(await authorizeCronRequest(request)).toBe(limited)
  })
})
