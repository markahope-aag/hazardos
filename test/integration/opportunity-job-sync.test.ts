/**
 * Opportunity <-> Job reverse-sync trigger tests
 *
 * Regression coverage for the sync_opportunity_from_job() trigger
 * (supabase/migrations/20260422000002_opportunity_reverse_sync_triggers.sql,
 * fixed in 20260712000002_fix_opportunity_job_sync_guard.sql).
 *
 * Bug: the trigger only linked opportunities.job_id back when
 * `outcome IS NULL`. The real UI flow marks the opportunity Won *before*
 * the job is created (mark Won -> "Create Job" link -> submit job form),
 * so by the time the job insert fires, outcome is already 'won' and the
 * UPDATE matched zero rows -- job_id was never set, so the opportunity
 * looked like it never produced a job.
 *
 * Uses the service-role client directly against the real DB (same pattern
 * as test/rls/rls-policies.test.ts) so the actual Postgres trigger runs.
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

describe.skipIf(!canRunLiveDbTests)('opportunity <-> job reverse-sync trigger', () => {
  let orgId: string
  let customerId: string
  let stageId: string
  let jobNumberCounter = 0

  beforeAll(async () => {
    if (!adminClient) return

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({ name: `Opp-Job Sync Test Org ${Date.now()}` })
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

    // Pipeline stages are auto-created per organization via trigger.
    const { data: stage, error: stageError } = await adminClient
      .from('pipeline_stages')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)
      .single()
    if (stageError) throw new Error(`Failed to find auto-created pipeline stage: ${stageError.message}`)
    stageId = stage!.id
  }, 30000)

  afterAll(async () => {
    if (!adminClient || !orgId) return
    await adminClient.from('jobs').delete().eq('organization_id', orgId)
    await adminClient.from('opportunities').delete().eq('organization_id', orgId)
    await adminClient.from('customers').delete().eq('organization_id', orgId)
    await adminClient.from('organizations').delete().eq('id', orgId)
  }, 30000)

  async function createOpportunity(name: string) {
    const { data, error } = await adminClient!
      .from('opportunities')
      .insert({
        organization_id: orgId,
        customer_id: customerId,
        name,
        stage_id: stageId,
      })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create opportunity: ${error.message}`)
    return data!.id as string
  }

  async function createJob(opportunityId: string) {
    jobNumberCounter += 1
    const { data, error } = await adminClient!
      .from('jobs')
      .insert({
        organization_id: orgId,
        customer_id: customerId,
        opportunity_id: opportunityId,
        job_number: `SYNC-TEST-${Date.now()}-${jobNumberCounter}`,
        scheduled_start_date: '2026-07-15',
        job_address: '123 Test St',
      })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create job: ${error.message}`)
    return data!.id as string
  }

  it('links job_id back even when the opportunity was already marked Won before the job existed', async () => {
    const opportunityId = await createOpportunity('Already-won opp')

    // Simulate clicking the "Won" button on the opportunity detail page —
    // this is the step that used to poison the later reverse-sync.
    const { error: winError } = await adminClient!
      .from('opportunities')
      .update({ outcome: 'won', opportunity_status: 'won', actual_close_date: '2026-07-01' })
      .eq('id', opportunityId)
    if (winError) throw winError

    const jobId = await createJob(opportunityId)

    const { data: opp, error } = await adminClient!
      .from('opportunities')
      .select('job_id, outcome, opportunity_status')
      .eq('id', opportunityId)
      .single()
    if (error) throw error

    expect(opp!.job_id).toBe(jobId)
    expect(opp!.outcome).toBe('won')
    expect(opp!.opportunity_status).toBe('won')
  })

  it('still marks the opportunity Won when the job is created before an explicit Won click', async () => {
    const opportunityId = await createOpportunity('Not-yet-won opp')

    const jobId = await createJob(opportunityId)

    const { data: opp, error } = await adminClient!
      .from('opportunities')
      .select('job_id, outcome, opportunity_status')
      .eq('id', opportunityId)
      .single()
    if (error) throw error

    expect(opp!.job_id).toBe(jobId)
    expect(opp!.outcome).toBe('won')
    expect(opp!.opportunity_status).toBe('won')
  })

  it('does not overwrite job_id if a second job is created for the same opportunity', async () => {
    const opportunityId = await createOpportunity('Duplicate-job-guard opp')
    const firstJobId = await createJob(opportunityId)
    await createJob(opportunityId)

    const { data: opp, error } = await adminClient!
      .from('opportunities')
      .select('job_id')
      .eq('id', opportunityId)
      .single()
    if (error) throw error

    expect(opp!.job_id).toBe(firstJobId)
  })
})
