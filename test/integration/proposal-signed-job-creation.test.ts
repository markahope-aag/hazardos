/**
 * P12: "Signed proposal -> job auto-created in scheduler view"
 *
 * Neither the digital-sign nor the verbal-approval route ever created a
 * job when a proposal's status flipped to 'signed' -- the verbal-approval
 * route's own comment says the downstream job flow was meant to react to
 * that transition "without a separate branch", but nothing ever did.
 *
 * create_job_from_signed_proposal() (20260712000005) is an AFTER UPDATE
 * trigger on proposals that creates a placeholder job (no assigned_to,
 * scheduled_start_date defaulted a few days out) the first time status
 * becomes 'signed', linked via jobs.proposal_id/estimate_id. This test
 * drives the same status transition against the real DB and asserts the
 * job appears, and that flipping status again doesn't create a duplicate.
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

describe.skipIf(!canRunLiveDbTests)('job auto-creation on proposal signed', () => {
  let orgId: string
  let customerId: string
  let surveyId: string
  let estimateId: string
  let proposalId: string

  beforeAll(async () => {
    if (!adminClient) return

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({ name: `Proposal Signed Job Test Org ${Date.now()}` })
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
        job_name: 'Signed-proposal job creation test survey',
        customer_name: 'Test Customer',
        site_address: '789 Signed Ave',
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
        estimate_number: `EST-SIGNED-JOB-TEST-${Date.now()}`,
        status: 'approved',
        total: 2500,
      })
      .select('id')
      .single()
    if (estimateError) throw new Error(`Failed to create estimate: ${estimateError.message}`)
    estimateId = estimate!.id

    const { data: accessToken } = await adminClient.rpc('generate_access_token')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: proposal, error: proposalError } = await adminClient
      .from('proposals')
      .insert({
        organization_id: orgId,
        estimate_id: estimateId,
        customer_id: customerId,
        proposal_number: `PRO-SIGNED-JOB-TEST-${Date.now()}`,
        status: 'sent',
        access_token: accessToken,
        access_token_expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()
    if (proposalError) throw new Error(`Failed to create proposal: ${proposalError.message}`)
    proposalId = proposal!.id
  }, 30000)

  afterAll(async () => {
    if (!adminClient || !orgId) return
    await adminClient.from('jobs').delete().eq('organization_id', orgId)
    await adminClient.from('proposals').delete().eq('organization_id', orgId)
    await adminClient.from('estimates').delete().eq('organization_id', orgId)
    await adminClient.from('site_surveys').delete().eq('organization_id', orgId)
    await adminClient.from('customers').delete().eq('organization_id', orgId)
    await adminClient.from('organizations').delete().eq('id', orgId)
  }, 30000)

  it('creates a placeholder job linked to the proposal once it is signed', async () => {
    const { error: signError } = await adminClient!
      .from('proposals')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('id', proposalId)
    expect(signError).toBeNull()

    const { data: jobs, error: jobsError } = await adminClient!
      .from('jobs')
      .select('*')
      .eq('proposal_id', proposalId)
    expect(jobsError).toBeNull()
    expect(jobs).toHaveLength(1)

    const job = jobs![0]
    expect(job.organization_id).toBe(orgId)
    expect(job.customer_id).toBe(customerId)
    expect(job.estimate_id).toBe(estimateId)
    expect(job.assigned_to).toBeNull()
    expect(job.job_address).toBe('789 Signed Ave')
    expect(job.scheduled_start_date).not.toBeNull()
  })

  it('does not create a second job if status is touched again', async () => {
    const { error } = await adminClient!
      .from('proposals')
      .update({ signer_name: 'Jane Doe' })
      .eq('id', proposalId)
    expect(error).toBeNull()

    const { data: jobs } = await adminClient!
      .from('jobs')
      .select('id')
      .eq('proposal_id', proposalId)
    expect(jobs).toHaveLength(1)
  })
})
