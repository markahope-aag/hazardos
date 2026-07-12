/**
 * Proposal token generation regression test (P1: "Generate a proposal from
 * an approved estimate — token URL created").
 *
 * generate_access_token() was defined in 20260201000000_create_estimates_
 * tables.sql but was missing from the live database (PGRST202 "could not
 * find the function ... in the schema cache") — no later migration drops
 * or renames it, so it most likely never actually reached the DB when
 * this migration file picked up the function after being recorded as
 * already-applied. app/api/proposals/route.ts destructured only `data`
 * from the RPC call (not `error`), so the missing function was silently
 * swallowed and every proposal was created with a NULL/missing access
 * token — breaking the entire downstream public-portal flow (status
 * updates, resend email, token URL, PDF download, signature, etc.).
 *
 * Fixed by 20260712000004_restore_generate_access_token.sql (recreates
 * the function) and a route-level fix that now throws if the RPC fails.
 * This test drives the exact same RPC + insert sequence POST /api/proposals
 * performs, against the real DB, so it would have failed before the fix.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const envResult = config({ path: '.env.local' })
const envVars = envResult.parsed || {}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const canRunLiveDbTests = Boolean(supabaseUrl && serviceRoleKey)

const adminClient = canRunLiveDbTests
  ? createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
  : null

describe.skipIf(!canRunLiveDbTests)('proposal token generation', () => {
  let orgId: string
  let customerId: string
  let surveyId: string
  let estimateId: string

  beforeAll(async () => {
    if (!adminClient) return

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({ name: `Proposal Token Test Org ${Date.now()}` })
      .select('id')
      .single()
    if (orgError) throw new Error(`Failed to create org: ${orgError.message}`)
    orgId = org!.id

    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .insert({
        organization_id: orgId,
        first_name: 'Test',
        last_name: 'Customer',
        name: 'Test Customer',
        contact_type: 'residential',
        status: 'inquiry',
      })
      .select('id')
      .single()
    if (customerError) throw new Error(`Failed to create customer: ${customerError.message}`)
    customerId = customer!.id

    const { data: survey, error: surveyError } = await adminClient
      .from('site_surveys')
      .insert({
        organization_id: orgId,
        customer_id: customerId,
        job_name: 'Proposal token test survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Denver',
        site_state: 'CO',
        site_zip: '80202',
        hazard_type: 'asbestos',
        status: 'draft',
      })
      .select('id')
      .single()
    if (surveyError) throw new Error(`Failed to create survey: ${surveyError.message}`)
    surveyId = survey!.id

    const { data: estimate, error: estimateError } = await adminClient
      .from('estimates')
      .insert({
        organization_id: orgId,
        site_survey_id: surveyId,
        customer_id: customerId,
        estimate_number: `EST-TOKEN-TEST-${Date.now()}`,
        status: 'approved',
        total: 1000,
      })
      .select('id')
      .single()
    if (estimateError) throw new Error(`Failed to create estimate: ${estimateError.message}`)
    estimateId = estimate!.id
  }, 30000)

  afterAll(async () => {
    if (!adminClient || !orgId) return
    await adminClient.from('proposals').delete().eq('organization_id', orgId)
    await adminClient.from('estimates').delete().eq('organization_id', orgId)
    await adminClient.from('site_surveys').delete().eq('organization_id', orgId)
    await adminClient.from('customers').delete().eq('organization_id', orgId)
    await adminClient.from('organizations').delete().eq('id', orgId)
  }, 30000)

  it('generates a real access token and creates a proposal with a usable token URL', async () => {
    const { data: proposalNumber, error: numberError } = await adminClient!
      .rpc('generate_proposal_number', { org_id: orgId })
    expect(numberError).toBeNull()

    const { data: accessToken, error: tokenError } = await adminClient!.rpc('generate_access_token')
    expect(tokenError).toBeNull()
    expect(accessToken).toBeTruthy()
    expect(accessToken).toMatch(/^[0-9a-f]{64}$/)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: proposal, error: createError } = await adminClient!
      .from('proposals')
      .insert({
        organization_id: orgId,
        estimate_id: estimateId,
        customer_id: customerId,
        proposal_number: proposalNumber || `PRO-${Date.now()}`,
        status: 'draft',
        access_token: accessToken,
        access_token_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(proposal).not.toBeNull()
    expect(proposal!.access_token).toBe(accessToken)
    expect(proposal!.access_token_expires_at).not.toBeNull()
  })
})
