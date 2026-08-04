import { beforeAll, describe, expect, test } from 'vitest'
import { apiCall, appUrl, waitForApp, setClientIp } from './helpers/api'

/**
 * Transport-level security behaviour that only exists at the HTTP edge: which
 * routes demand a session, which are deliberately public, and how the app treats
 * hostile input in redirect targets and Origin headers.
 *
 * Ported from the HTTP half of .qa-harness/50-sec-extra.mjs (SEC7, SEC10, SEC29,
 * SEC30). The RLS half of that file moved into rls-role-scoping.test.ts.
 */
describe('HTTP edge security', () => {
  beforeAll(async () => {
    setClientIp('10.99.4.1') // own rate-limit bucket; see helpers/api.ts
    await waitForApp()
  })

  test('internal API routes reject an unauthenticated caller', async () => {
    // Not /api/v1/* — those use Bearer keys. These are session-authenticated.
    for (const path of ['/api/settings', '/api/webhooks']) {
      const r = await apiCall('GET', path)
      expect(
        [401, 403, 302, 307].includes(r.status),
        `${path} answered ${r.status} to an anonymous caller`,
      ).toBe(true)
    }
  })

  test('deliberately public routes are not redirected to login', async () => {
    // proxy.ts carves these out on purpose: provider webhooks and the public
    // feedback page carry no session cookie and must not bounce to /login.
    for (const path of ['/api/webhooks/twilio/status', '/feedback']) {
      const r = await apiCall('GET', path)
      expect([302, 307].includes(r.status), `${path} was auth-redirected (${r.status})`).toBe(false)
    }
  })

  test('the auth confirm route ignores an external next= target', async () => {
    // Classic open-redirect: ?next=https://evil.example.com must not be honoured.
    const r = await apiCall(
      'GET',
      '/auth/confirm?next=https://evil.example.com&token_hash=x&type=email',
    )
    const location = r.headers.get('location') ?? ''
    expect(location).not.toMatch(/evil\.example\.com/)
  })

  test('a disallowed Origin is not reflected in Access-Control-Allow-Origin', async () => {
    const res = await fetch(`${appUrl()}/api/settings`, {
      headers: { Origin: 'https://evil.example.com' },
      redirect: 'manual',
    })
    const allowOrigin = res.headers.get('access-control-allow-origin') ?? ''
    expect(allowOrigin).not.toBe('https://evil.example.com')
    expect(allowOrigin).not.toBe('*')
  })
})
