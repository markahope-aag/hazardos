import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { createTenant, type Tenant } from './helpers/fixtures'

/**
 * Tenant isolation between two real organisations. This is the property that
 * matters most on a shared production database: whatever else is wrong, one
 * customer must never see or touch another's rows.
 *
 * Ported from .qa-harness/20-integrity-isolation.mjs. The manual version of these
 * checks is what was run by hand before giving an outside client access; this
 * makes them repeatable.
 */
describe('cross-organisation isolation', () => {
  let a: Tenant
  let b: Tenant

  beforeAll(async () => {
    a = await createTenant('iso-a')
    b = await createTenant('iso-b')
  })

  afterAll(async () => {
    await a?.cleanup()
    await b?.cleanup()
  })

  test('CONTROL: org A can read its own contact', async () => {
    // Without this, every isolation test below would pass vacuously if the user
    // could see nothing at all — which is exactly how a missing auth trigger
    // hid itself when this suite was first written.
    const { data, error } = await a.roles.tenant_owner.client
      .from('customers')
      .select('id')
      .eq('id', a.fixtures.customerId)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(1)
  })

  test('org A cannot read org B contacts', async () => {
    const { data } = await a.roles.tenant_owner.client
      .from('customers')
      .select('id')
      .eq('id', b.fixtures.customerId)
    expect(data ?? []).toHaveLength(0)
  })

  test('org A sees only its own rows in an unfiltered read', async () => {
    for (const table of ['customers', 'opportunities', 'estimates', 'jobs', 'invoices']) {
      const { data, error } = await a.roles.tenant_owner.client
        .from(table)
        .select('id, organization_id')
        .limit(500)
      expect(error, `${table} read errored`).toBeNull()
      const foreign = (data ?? []).filter((r) => r.organization_id !== a.orgId)
      expect(foreign, `${table} leaked rows from another org`).toHaveLength(0)
    }
  })

  test('org A cannot update an org B contact', async () => {
    await a.roles.tenant_owner.client
      .from('customers')
      .update({ city: 'Hopped' })
      .eq('id', b.fixtures.customerId)
      .select()

    // Service read-back is the arbiter: a filtered-to-zero update does not error.
    const { data } = await b.svc
      .from('customers')
      .select('city')
      .eq('id', b.fixtures.customerId)
      .single()
    expect(data?.city).not.toBe('Hopped')
  })

  test('org A cannot insert a row into org B', async () => {
    const { data } = await a.roles.viewer.client
      .from('customers')
      .insert({
        organization_id: b.orgId,
        first_name: 'Cross',
        last_name: 'Insert',
        name: 'Cross Insert',
        contact_type: 'residential',
        status: 'prospect',
      })
      .select()
    if (data?.length) await b.svc.from('customers').delete().eq('id', data[0].id)
    expect(data ?? []).toHaveLength(0)
  })
})

describe('invoice payment integrity', () => {
  let t: Tenant

  beforeAll(async () => {
    t = await createTenant('pay')
  })

  afterAll(async () => {
    await t?.cleanup()
  })

  test('the server rejects a payment larger than the invoice balance', async () => {
    // A $500 payment against a $100 invoice. The browser dialog guards this, but
    // the guard that counts is the one in record_invoice_payment.
    const inv = await t.svc
      .from('invoices')
      .insert({
        organization_id: t.orgId,
        customer_id: t.fixtures.customerId,
        invoice_number: `INV-${t.tag}-over`,
        status: 'sent',
        invoice_date: '2026-07-01',
        due_date: '2026-08-01',
        subtotal: 100,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total: 100,
        amount_paid: 0,
        balance_due: 100,
      })
      .select('id')
      .single()
    expect(inv.error).toBeNull()
    const invoiceId = inv.data!.id

    const { error } = await t.roles.admin.client.rpc('record_invoice_payment', {
      p_invoice_id: invoiceId,
      p_amount: 500,
      p_payment_date: '2026-07-02',
      p_payment_method: 'check',
      p_reference_number: `${t.tag}-over`,
      p_notes: 'overpayment probe',
      p_created_by: t.roles.admin.userId,
    })

    const { data: after } = await t.svc
      .from('invoices')
      .select('balance_due, amount_paid')
      .eq('id', invoiceId)
      .single()

    // Either the RPC refused, or it clamped — what must never happen is a
    // negative balance, which means the overpayment was banked.
    expect(error !== null || Number(after?.balance_due) >= 0).toBe(true)
    expect(Number(after?.balance_due)).toBeGreaterThanOrEqual(0)
  })
})
