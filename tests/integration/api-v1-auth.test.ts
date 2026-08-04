import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { apiCall, mintApiKey, waitForApp, setClientIp } from './helpers/api'
import { createTenant, type Tenant } from './helpers/fixtures'

/**
 * Public API v1 authentication, scoping and transport behaviour, exercised over
 * real HTTP against a running app. Ported from .qa-harness/60-api-remaining.mjs.
 *
 * These cannot be covered by the database suite: the checks are about what the
 * route layer does with a key before it ever reaches Postgres.
 */
describe('v1 API authentication and scoping', () => {
  let t: Tenant
  let other: Tenant
  let fullKey: string
  let readOnlyKey: string
  let noCustomerScopeKey: string
  let inactiveKey: string
  let tinyQuotaKey: string

  beforeAll(async () => {
    setClientIp('10.99.1.1') // own rate-limit bucket; see helpers/api.ts
    await waitForApp()
    t = await createTenant('api')
    other = await createTenant('api-other')
    fullKey = (await mintApiKey(t.svc, t.orgId, { label: 'full' })).key
    readOnlyKey = (await mintApiKey(t.svc, t.orgId, {
      scopes: ['customers:read', 'companies:read'],
      label: 'readonly',
    })).key
    noCustomerScopeKey = (await mintApiKey(t.svc, t.orgId, {
      scopes: ['companies:read'],
      label: 'noscope',
    })).key
    inactiveKey = (await mintApiKey(t.svc, t.orgId, { isActive: false, label: 'inactive' })).key
    tinyQuotaKey = (await mintApiKey(t.svc, t.orgId, { rateLimit: 3, label: 'quota' })).key
  })

  afterAll(async () => {
    await t?.svc.from('api_keys').delete().eq('organization_id', t.orgId)
    await t?.cleanup()
    await other?.cleanup()
  })

  test('CONTROL: a valid key authenticates', async () => {
    // Everything below asserts rejection, so this proves rejections are not just
    // "the endpoint is broken for everyone".
    const r = await apiCall('GET', '/api/v1/customers?limit=1', { key: fullKey })
    expect(r.status).toBe(200)
  })

  test('a request with no Authorization header is rejected', async () => {
    const r = await apiCall('GET', '/api/v1/customers')
    expect(r.status).toBe(401)
  })

  test('Basic auth is rejected', async () => {
    const r = await apiCall('GET', '/api/v1/customers', {
      headers: { authorization: 'Basic ' + Buffer.from('a:b').toString('base64') },
    })
    expect(r.status).toBe(401)
  })

  test('a malformed key is rejected', async () => {
    const r = await apiCall('GET', '/api/v1/customers', { key: 'not-a-real-key' })
    expect(r.status).toBe(401)
  })

  test('an unknown but well-formed key is rejected', async () => {
    const r = await apiCall('GET', '/api/v1/customers', { key: 'hzd_live_' + 'z'.repeat(32) })
    expect(r.status).toBe(401)
  })

  test('a deactivated key is rejected on every collection', async () => {
    for (const ep of ['customers', 'companies', 'estimates']) {
      const r = await apiCall('GET', `/api/v1/${ep}?limit=1`, { key: inactiveKey })
      expect(r.status, `${ep} accepted a deactivated key`).toBe(401)
    }
  })

  test('a key without customers:read is refused, and told why', async () => {
    const r = await apiCall('GET', '/api/v1/customers?limit=1', { key: noCustomerScopeKey })
    expect(r.status).toBe(403)
    expect(String(r.json?.error ?? '')).toMatch(/customers:read/i)
  })

  test('a read-only key cannot POST', async () => {
    const r = await apiCall('POST', '/api/v1/customers', {
      key: readOnlyKey,
      body: { first_name: 'Scope', last_name: 'Probe' },
    })
    expect(r.status).toBe(403)
    expect(String(r.json?.error ?? '')).toMatch(/customers:write/i)
  })

  test('a key cannot read another organisation record by id', async () => {
    const r = await apiCall('GET', `/api/v1/customers/${other.fixtures.customerId}`, { key: fullKey })
    expect(r.status).toBe(404)
  })

  test('unknown ids return 404, not 200', async () => {
    const missing = '00000000-0000-0000-0000-000000000000'
    for (const path of [`/api/v1/customers/${missing}`, `/api/v1/jobs/${missing}`, `/api/v1/companies/${missing}`]) {
      const r = await apiCall('GET', path, { key: fullKey })
      expect(r.status, `${path} did not 404`).toBe(404)
    }
  })

  test('the per-key quota returns 429 once exhausted', async () => {
    // rate_limit = 3, so six sequential calls must trip it.
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const r = await apiCall('GET', '/api/v1/customers?limit=1', { key: tinyQuotaKey })
      statuses.push(r.status)
    }
    expect(statuses, `expected a 429 in ${statuses.join(',')}`).toContain(429)
  })

  test('pagination echoes totals and defaults to 50', async () => {
    const r = await apiCall('GET', '/api/v1/customers', { key: fullKey })
    expect(r.status).toBe(200)
    const pagination = r.json?.pagination as Record<string, unknown> | undefined
    expect(pagination).toBeDefined()
    expect(pagination?.limit).toBe(50)
    expect(pagination).toHaveProperty('total')
  })

  test('an invalid JSON body is rejected with 400', async () => {
    const r = await apiCall('POST', '/api/v1/customers', { key: fullKey, rawBody: '{not json' })
    expect(r.status).toBe(400)
  })

  test('CORS preflight is answered with methods and a max-age', async () => {
    const r = await apiCall('OPTIONS', '/api/v1/customers', {
      headers: { origin: 'https://example.com', 'access-control-request-method': 'GET' },
    })
    expect([200, 204]).toContain(r.status)
    expect(r.headers.get('access-control-allow-methods')).toBeTruthy()
    expect(r.headers.get('access-control-max-age')).toBeTruthy()
  })

  test('error responses do not leak SQL or stack traces', async () => {
    const r = await apiCall('GET', '/api/v1/customers?limit=abc', { key: fullKey })
    const body = r.text
    expect(body).not.toMatch(/(select\s+.*\s+from\s+|pg_|\bat\s+\/|node_modules|SQLSTATE)/i)
  })

  test('using a key updates its last_used_at', async () => {
    const { key, id } = await mintApiKey(t.svc, t.orgId, { label: 'lastused' })
    const before = await t.svc.from('api_keys').select('last_used_at').eq('id', id).single()
    await apiCall('GET', '/api/v1/customers?limit=1', { key })
    // The write is best-effort and may lag the response slightly.
    await new Promise((r) => setTimeout(r, 1500))
    const after = await t.svc.from('api_keys').select('last_used_at').eq('id', id).single()
    expect(after.data?.last_used_at).not.toBeNull()
    expect(after.data?.last_used_at).not.toBe(before.data?.last_used_at)
  })
})
