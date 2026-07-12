/**
 * Manual job creation regression test.
 *
 * lib/validations/jobs.ts (createJobSchema), lib/services/jobs-service.ts
 * (JobsService.create), and the create_job_from_proposal RPC
 * (20260702000005) all require and insert an `assigned_to` column on
 * `jobs` — but no migration had ever added it. Every manual job creation
 * failed with Postgres 42703 "column jobs.assigned_to does not exist"
 * until 20260712000003_add_jobs_assigned_to.sql added it.
 *
 * This inserts a job the same way JobsService.create does (organization_id,
 * job_number, customer_id, assigned_to, name, scheduled_start_date,
 * job_address, status, created_by) directly against the real DB, so it
 * exercises the actual column set rather than a mocked client.
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

describe.skipIf(!canRunLiveDbTests)('manual job creation', () => {
  let orgId: string
  let customerId: string
  let technicianId: string

  beforeAll(async () => {
    if (!adminClient) return

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({ name: `Manual Job Creation Test Org ${Date.now()}` })
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

    const email = `job-creation-test-${Date.now()}@hazardos-test.local`
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: 'JobCreationTest!2026Secure',
      email_confirm: true,
    })
    if (authError || !authUser.user) throw new Error(`Failed to create technician user: ${authError?.message || 'no user'}`)
    technicianId = authUser.user.id

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ organization_id: orgId, role: 'technician', first_name: 'Test', last_name: 'Tech' })
      .eq('id', technicianId)
    if (profileError) throw new Error(`Failed to set up technician profile: ${profileError.message}`)
  }, 30000)

  afterAll(async () => {
    if (!adminClient) return
    if (orgId) {
      await adminClient.from('jobs').delete().eq('organization_id', orgId)
      await adminClient.from('customers').delete().eq('organization_id', orgId)
      await adminClient.from('organizations').delete().eq('id', orgId)
    }
    if (technicianId) await adminClient.auth.admin.deleteUser(technicianId)
  }, 30000)

  it('creates a job with an assigned technician, matching JobsService.create\'s insert shape', async () => {
    const { data: job, error } = await adminClient!
      .from('jobs')
      .insert({
        organization_id: orgId,
        job_number: `JOB-MANUAL-TEST-${Date.now()}`,
        customer_id: customerId,
        assigned_to: technicianId,
        name: 'Manual test job',
        scheduled_start_date: '2026-07-20',
        job_address: '456 Test Ave',
        status: 'scheduled',
        created_by: technicianId,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(job).not.toBeNull()
    expect(job!.assigned_to).toBe(technicianId)
  })
})
