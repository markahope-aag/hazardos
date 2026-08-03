import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { anonClient } from './helpers/stack'
import { createTenant, updateProbe, type Tenant } from './helpers/fixtures'

/**
 * Role-scoping at the DATABASE layer, exercised with raw supabase-js as each
 * seeded role — i.e. a write the browser UI would never offer, made by someone
 * who has a valid session but not the authority.
 *
 * The unit suite cannot cover any of this: it mocks the Supabase client, so a
 * policy is never consulted and every one of these would pass vacuously.
 *
 * Ported from .qa-harness/10-rls.mjs and 51-sec-batch2.mjs.
 */
describe('RLS role scoping', () => {
  let t: Tenant

  beforeAll(async () => {
    t = await createTenant('rls')
  })

  afterAll(async () => {
    await t?.cleanup()
  })

  test('CONTROL: viewer can READ the opportunity it may not edit', async () => {
    // "Cannot write" only means something if the row is visible. If the viewer
    // could not see it, every write probe below would pass for the wrong reason.
    const { data, error } = await t.roles.viewer.client
      .from('opportunities')
      .select('id')
      .eq('id', t.fixtures.opportunityId)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(1)
  })

  test('viewer cannot rename an opportunity', async () => {
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.viewer.client,
      table: 'opportunities',
      id: t.fixtures.opportunityId,
      column: 'name',
      sentinel: `${t.tag}-sec17`,
    })
    expect(r.applied).toBe(false)
  })

  test('viewer cannot rename a pipeline stage', async () => {
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.viewer.client,
      table: 'pipeline_stages',
      id: t.fixtures.stageId,
      column: 'name',
      sentinel: `${t.tag}-stage`,
    })
    expect(r.applied).toBe(false)
  })

  test('viewer cannot edit an estimate', async () => {
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.viewer.client,
      table: 'estimates',
      id: t.fixtures.estimateId,
      column: 'project_name',
      sentinel: `${t.tag}-sec19`,
    })
    expect(r.applied).toBe(false)
  })

  test('technician cannot change an estimate line item price', async () => {
    // A single successful write here proves the absence of a role gate, and it
    // would also bypass the estimate lock on non-draft estimates.
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.technician.client,
      table: 'estimate_line_items',
      id: t.fixtures.lineItemId,
      column: 'unit_price',
      sentinel: 903.21,
    })
    expect(r.applied).toBe(false)
  })

  test('technician cannot change a customer address', async () => {
    // Guarded by an admin-only address-change trigger, so this needs a REAL value
    // change: writing the same value back would not fire the trigger.
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.technician.client,
      table: 'customers',
      id: t.fixtures.customerId,
      column: 'city',
      sentinel: 'Boulder',
    })
    expect(r.applied).toBe(false)
  })

  test('admin CAN change a customer address (control for the trigger)', async () => {
    // Without this control, the previous test would still pass if the trigger
    // were blocking everyone, or if the column simply never accepted writes.
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.admin.client,
      table: 'customers',
      id: t.fixtures.customerId,
      column: 'city',
      sentinel: 'Lakewood',
    })
    expect(r.applied, `admin address change blocked (code=${r.code})`).toBe(true)
  })

  test('estimator cannot move a job into another organisation', async () => {
    const NIL = '00000000-0000-0000-0000-000000000000'
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.estimator.client,
      table: 'jobs',
      id: t.fixtures.jobId,
      column: 'organization_id',
      sentinel: NIL,
    })
    expect(r.applied).toBe(false)
  })

  test('a guarded money field on a finalised invoice is locked', async () => {
    // enforce_invoice_content_locked freezes discount_amount/tax_rate/dates on a
    // non-draft invoice. notes and status stay editable BY DESIGN, so the probe
    // has to target a guarded column to mean anything.
    const r = await updateProbe({
      svc: t.svc,
      client: t.roles.admin.client,
      table: 'invoices',
      id: t.fixtures.voidInvoiceId,
      column: 'discount_amount',
      sentinel: 13.13,
    })
    expect(r.applied).toBe(false)
  })

  test('an existing user cannot create a second organisation', async () => {
    const { data, error } = await t.roles.viewer.client
      .from('organizations')
      .insert({ name: `${t.tag} should-not-exist` })
      .select()

    if (!error && data?.length) {
      await t.svc.from('organizations').delete().eq('id', data[0].id)
    }
    expect(data ?? []).toHaveLength(0)
  })

  test('authenticated users cannot read reporting matviews directly', async () => {
    const { data, error } = await t.roles.admin.client
      .from('mv_sales_performance')
      .select('*')
      .limit(1)
    // Either a permission error or not-exposed is fine; a clean read is a leak.
    expect(error ?? data).not.toEqual([])
    expect(error).not.toBeNull()
  })

  test('a viewer cannot mint an API key', async () => {
    const sentinel = `${t.tag}-apikey`
    await t.roles.viewer.client.from('api_keys').insert({
      organization_id: t.orgId,
      name: sentinel,
      key_prefix: 'hzd_live_zzzzz',
      key_hash: 'x'.repeat(64),
      scopes: ['customers:read'],
    })
    const { data: landed } = await t.svc.from('api_keys').select('id').eq('name', sentinel)
    if (landed?.length) await t.svc.from('api_keys').delete().eq('name', sentinel)
    expect(landed ?? []).toHaveLength(0)
  })
})

describe('SECURITY DEFINER helpers are not reachable anonymously', () => {
  test('anon cannot execute platform helper functions', async () => {
    const anon = anonClient()
    const a = await anon.rpc('is_platform_user')
    const b = await anon.rpc('get_user_organization_id')
    // Grants are revoked from anon, so these error or come back null.
    expect(a.error !== null || a.data === null).toBe(true)
    expect(b.error !== null || b.data === null).toBe(true)
  })
})
