/**
 * I13: "Invoice link to customer — opens a clean view (no internal
 * details)". There was no customer-facing invoice view at all — no
 * access_token column, no public route. Added get_invoice_for_portal, a
 * SECURITY DEFINER function that returns an explicit allowlist of
 * customer-facing fields for a valid, unexpired access_token, without
 * granting anon any RLS access to invoices/customers/organizations
 * directly.
 *
 * Run against the real DB (not mocks) because the thing actually being
 * verified is DB-side: the SECURITY DEFINER function's token-matching
 * logic, the anon EXECUTE grant, and that anon still can't read the
 * invoices table directly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const envResult = config({ path: '.env.local' })
const envVars = envResult.parsed || {}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const canRunLiveDbTests = Boolean(supabaseUrl && serviceRoleKey && anonKey)

const adminClient = canRunLiveDbTests
  ? createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
  : null
const anonClient = canRunLiveDbTests
  ? createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
  : null

describe.skipIf(!canRunLiveDbTests)('get_invoice_for_portal (I13)', () => {
  let orgId: string
  let customerId: string
  let invoiceId: string
  let token: string

  beforeAll(async () => {
    if (!adminClient) return

    const { data: org } = await adminClient
      .from('organizations')
      .insert({ name: `Portal Link Test Org ${Date.now()}` })
      .select('id')
      .single()
    orgId = org!.id

    const { data: customer } = await adminClient
      .from('customers')
      .insert({
        organization_id: orgId,
        first_name: 'Pat', last_name: 'Portal', name: 'Pat Portal',
        company_name: 'Portal Testing LLC',
        contact_type: 'commercial', status: 'inquiry',
      })
      .select('id')
      .single()
    customerId = customer!.id

    const { data: generatedToken } = await adminClient.rpc('generate_access_token')
    token = generatedToken as string

    const { data: invoice } = await adminClient
      .from('invoices')
      .insert({
        organization_id: orgId,
        customer_id: customerId,
        invoice_number: `PORTAL-TEST-${Date.now()}`,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        access_token: token,
        access_token_expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
        notes: 'Thanks for your business!',
      })
      .select('id')
      .single()
    invoiceId = invoice!.id

    await adminClient.from('invoice_line_items').insert({
      invoice_id: invoiceId,
      description: 'Asbestos abatement',
      quantity: 1,
      unit_price: 2500,
      line_total: 2500,
      sort_order: 0,
    })
  }, 30000)

  afterAll(async () => {
    if (!adminClient || !orgId) return
    await adminClient.from('invoice_line_items').delete().eq('invoice_id', invoiceId)
    await adminClient.from('invoices').delete().eq('organization_id', orgId)
    await adminClient.from('customers').delete().eq('organization_id', orgId)
    await adminClient.from('organizations').delete().eq('id', orgId)
  }, 30000)

  it('returns curated invoice data for a valid token, callable by anon', async () => {
    const { data, error } = await anonClient!.rpc('get_invoice_for_portal', { p_token: token })

    expect(error).toBeNull()
    expect(data).toMatchObject({
      invoice_number: expect.stringContaining('PORTAL-TEST-'),
      customer: expect.objectContaining({ company_name: 'Portal Testing LLC' }),
      line_items: [expect.objectContaining({ description: 'Asbestos abatement', line_total: 2500 })],
    })
  })

  it('marks the invoice viewed after an anon read', async () => {
    await anonClient!.rpc('get_invoice_for_portal', { p_token: token })

    const { data: after } = await adminClient!
      .from('invoices')
      .select('viewed_at')
      .eq('id', invoiceId)
      .single()
    expect(after?.viewed_at).not.toBeNull()
  })

  it('returns null for an expired token', async () => {
    const { data: expiredToken } = await adminClient!.rpc('generate_access_token')
    await adminClient!
      .from('invoices')
      .update({
        access_token: expiredToken,
        access_token_expires_at: new Date(Date.now() - 86400000).toISOString(),
      })
      .eq('id', invoiceId)

    const { data } = await anonClient!.rpc('get_invoice_for_portal', { p_token: expiredToken })
    expect(data).toBeNull()
  })

  it('returns null for a token that does not exist', async () => {
    const { data } = await anonClient!.rpc('get_invoice_for_portal', {
      p_token: 'this-token-does-not-exist',
    })
    expect(data).toBeNull()
  })

  it('still denies anon direct table access to invoices', async () => {
    const { data, error } = await anonClient!.from('invoices').select('*').eq('id', invoiceId)
    expect(data == null || data.length === 0).toBe(true)
    void error
  })
})
