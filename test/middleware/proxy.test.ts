import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// The proxy delegates session refresh and CORS to these; stub them so the test
// exercises only the redirect/allow logic. updateSession returns a plain
// pass-through response (what an unauthenticated request would produce).
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async () => NextResponse.next()),
}))
vi.mock('@/lib/middleware/cors', () => ({
  corsMiddleware: vi.fn(() => null),
}))

import { proxy } from '@/proxy'

function makeRequest(path: string, opts: { authed?: boolean } = {}): NextRequest {
  const headers: Record<string, string> = {}
  if (opts.authed) {
    // Chunked Supabase auth cookie — matched by name.includes('-auth-token').
    headers.cookie = 'sb-project-auth-token.0=header.payload; sb-project-auth-token.1=signature'
  }
  return new NextRequest(new URL(`http://localhost${path}`), { headers })
}

function redirectTarget(response: NextResponse): string | null {
  if (response.status !== 307 && response.status !== 308) return null
  return response.headers.get('location')
}

describe('proxy route gating', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lets unauthenticated Vercel cron requests reach the handler', async () => {
    // Regression guard: cron paths carry no Supabase cookie. If the proxy
    // redirects them to /login, the scheduled job silently never runs.
    for (const path of [
      '/api/cron/credential-expiry',
      '/api/cron/appointment-reminders',
      '/api/cron/photo-lifecycle',
    ]) {
      const res = await proxy(makeRequest(path))
      expect(redirectTarget(res)).toBeNull()
    }
  })

  it('still allows webhook and auth API routes through unauthenticated', async () => {
    for (const path of ['/api/webhooks/resend', '/api/auth/forgot-password']) {
      const res = await proxy(makeRequest(path))
      expect(redirectTarget(res)).toBeNull()
    }
  })

  it('lets unauthenticated customers reach token-gated public routes (FB1)', async () => {
    // External customers open emailed links with no account and no session
    // cookie. If the proxy redirects these to /login, the proposal portal,
    // invoice portal, and feedback survey all fail for their intended
    // audience. Each authenticates by the access token in the URL/body.
    for (const path of [
      '/portal/proposal/abc123',
      '/portal/invoice/abc123',
      '/feedback/tok_survey',
      '/sms-consent',
      '/offline',
      '/api/portal/invoice/abc123',
      '/api/portal/proposal/abc123',
      '/api/feedback/submit/tok_survey',
      '/api/proposals/sign',
      '/api/billing/plans',
    ]) {
      const res = await proxy(makeRequest(path))
      expect(redirectTarget(res), `${path} should not redirect`).toBeNull()
    }
  })

  it('still protects the admin feedback endpoints (only /submit is public)', async () => {
    // /api/feedback/submit is public, but the rest of /api/feedback (list,
    // stats, testimonials, send) must still require auth.
    for (const path of [
      '/api/feedback/stats',
      '/api/feedback/testimonials',
      '/api/feedback/some-id/send',
    ]) {
      const res = await proxy(makeRequest(path))
      expect(redirectTarget(res), `${path} should redirect`).toContain('/login')
    }
  })

  it('redirects unauthenticated dashboard requests to /login', async () => {
    const res = await proxy(makeRequest('/crm/contacts'))
    expect(redirectTarget(res)).toContain('/login')
  })

  it('does not redirect the home route', async () => {
    const res = await proxy(makeRequest('/'))
    expect(redirectTarget(res)).toBeNull()
  })

  it('bounces authenticated users away from auth pages', async () => {
    const res = await proxy(makeRequest('/login', { authed: true }))
    expect(redirectTarget(res)).toContain('/')
  })
})
