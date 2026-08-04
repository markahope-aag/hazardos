import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { apiCall, mintApiKey, waitForApp } from './helpers/api'
import { createTenant, type Tenant } from './helpers/fixtures'

/**
 * Per-IP throttling on the v1 collections. Ported from API23 in
 * .qa-harness/40-v1-api.mjs.
 *
 * Deliberately named to sort last. It fires ~130 requests in bursts, and the
 * per-IP bucket really does exist, so anything running afterwards from the same
 * address gets 429s that look like unrelated failures. Vitest runs files in path
 * order with fileParallelism disabled, so `zz-` keeps this at the end.
 *
 * Consequence worth knowing: two full runs back to back will fail the second
 * one, because the limiter window (a minute) is still saturated when it starts.
 * CI runs once on a fresh runner so it is unaffected; locally, wait a minute
 * between runs or use `--exclude` to skip this file.
 */
describe('v1 API throttling', () => {
  let t: Tenant
  let key: string

  beforeAll(async () => {
    await waitForApp()
    t = await createTenant('thr')
    // Deliberately a huge per-key quota: this test is about the per-IP limiter,
    // and a per-key 429 would be a false positive.
    key = (await mintApiKey(t.svc, t.orgId, { rateLimit: 1_000_000, label: 'throttle' })).key
  })

  afterAll(async () => {
    await t?.svc.from('api_keys').delete().eq('organization_id', t.orgId)
    await t?.cleanup()
  })

  /**
   * Each burst uses its OWN address. Sharing one would let the second burst
   * "pass" purely because the first had already exhausted that bucket — a
   * vacuous green that proves nothing about the endpoint under test.
   */
  const burst = async (endpoint: string, clientIp: string, n = 65) => {
    const results = await Promise.all(
      Array.from({ length: n }, () =>
        apiCall('GET', `/api/v1/${endpoint}?limit=1`, { key, clientIp }),
      ),
    )
    return {
      throttled: results.filter((r) => r.status === 429).length,
      ok: results.filter((r) => r.status === 200).length,
    }
  }

  test('CONTROL: a burst against /customers is throttled', async () => {
    const { throttled, ok } = await burst('customers', '10.99.9.1')
    expect(throttled, `customers: ${ok}×200, ${throttled}×429`).toBeGreaterThan(0)
  })

  test('a burst against /estimates is throttled', async () => {
    // This is the assertion the harness recorded as FAILING: handleGet on
    // estimates (and invoices, jobs) never calls applyUnifiedRateLimit, so only
    // customers and companies get the per-IP 'public' limiter. Everything else
    // has a per-key hourly quota and nothing more, which means an attacker with
    // one valid key can hammer these collections from a single IP unimpeded.
    const { throttled, ok } = await burst('estimates', '10.99.9.2')
    expect(throttled, `estimates: ${ok}×200, ${throttled}×429 — per-IP limiter absent`).toBeGreaterThan(0)
  })
})
