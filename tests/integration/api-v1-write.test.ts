import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { apiCall, mintApiKey, waitForApp, setClientIp } from './helpers/api'
import { createTenant, type Tenant } from './helpers/fixtures'

/**
 * The public API's write surface. Ported from .qa-harness/40-v1-api.mjs
 * (APIWRITE, API20, API23).
 *
 * The harness recorded these as findings rather than passes: it claimed the v1
 * POST routes were written against a pre-refactor schema and returned 500, and
 * that the estimates/invoices/jobs collections skip the per-IP limiter. They are
 * written here as plain assertions so the current truth decides.
 */
describe('v1 API write paths', () => {
  let t: Tenant
  let key: string

  beforeAll(async () => {
    setClientIp('10.99.3.1') // own rate-limit bucket; see helpers/api.ts
    await waitForApp()
    t = await createTenant('apiw')
    key = (await mintApiKey(t.svc, t.orgId, { label: 'write' })).key
  })

  afterAll(async () => {
    await t?.svc.from('api_keys').delete().eq('organization_id', t.orgId)
    await t?.cleanup()
  })

  test('POST /v1/customers creates a contact', async () => {
    const r = await apiCall('POST', '/api/v1/customers', {
      key,
      body: { first_name: 'Api', last_name: 'Created', email: `api-${Date.now()}@example.test` },
    })
    expect(r.status, `body: ${r.text.slice(0, 300)}`).toBe(201)
    expect((r.json?.data as { id?: string } | undefined)?.id).toBeTruthy()
  })

  test('POST /v1/estimates creates an estimate', async () => {
    const r = await apiCall('POST', '/api/v1/estimates', {
      key,
      body: {
        customer_id: t.fixtures.customerId,
        line_items: [{ description: 'Api line', quantity: 1, unit_price: 100 }],
      },
    })
    expect(r.status, `body: ${r.text.slice(0, 300)}`).toBe(201)
  })

  test('POST /v1/invoices creates an invoice', async () => {
    const r = await apiCall('POST', '/api/v1/invoices', {
      key,
      body: {
        customer_id: t.fixtures.customerId,
        line_items: [{ description: 'Api line', quantity: 1, unit_price: 100 }],
      },
    })
    expect(r.status, `body: ${r.text.slice(0, 300)}`).toBe(201)
  })

  test('POST /v1/jobs creates a job', async () => {
    const r = await apiCall('POST', '/api/v1/jobs', {
      key,
      body: {
        customer_id: t.fixtures.customerId,
        job_type: 'inspection',
        scheduled_date: '2026-12-31',
        site_address_line1: '1 Api St',
        site_city: 'Denver',
        site_state: 'CO',
        site_zip: '80211',
      },
    })
    expect(r.status, `body: ${r.text.slice(0, 300)}`).toBe(201)
  })

  test('concurrent estimate creates all succeed with distinct numbers', async () => {
    // Entity numbers are allocated per organisation. Without a retry on 23505 and
    // a UNIQUE index behind it, concurrent creates either duplicate a number or
    // blow up, and the failure only appears under real parallelism.
    const N = 8
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        apiCall('POST', '/api/v1/estimates', {
          key,
          body: {
            customer_id: t.fixtures.customerId,
            line_items: [{ description: 'race', quantity: 1, unit_price: 1 }],
          },
        }),
      ),
    )

    const created = results.filter((r) => r.status === 201)
    expect(created.length, `only ${created.length}/${N} concurrent creates succeeded`).toBe(N)

    const numbers = created.map(
      (r) => (r.json?.data as { estimate_number?: string } | undefined)?.estimate_number,
    )
    expect(new Set(numbers).size, `duplicate estimate numbers: ${numbers.join(', ')}`).toBe(N)
  })
})
