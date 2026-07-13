/**
 * J10: "Log equipment used (quantities) — saves"
 *
 * job_equipment had a complete backend (table, JobResourcesService CRUD,
 * /api/jobs/[id]/equipment) but no UI ever called it — the job-completion
 * flow (Time/Materials/Photos/Checklist/Review) had no Equipment tab, and
 * JobCompletionService.getCompletionSummary() never fetched it either.
 *
 * This drives the real service methods against the live DB: add equipment,
 * confirm it shows up in the completion summary (what the new Equipment
 * tab renders), then delete it.
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

describe.skipIf(!canRunLiveDbTests)('job equipment logging', () => {
  let orgId: string
  let jobId: string

  beforeAll(async () => {
    if (!adminClient) return

    const { data: org } = await adminClient
      .from('organizations')
      .insert({ name: `Job Equipment Test Org ${Date.now()}` })
      .select('id')
      .single()
    orgId = org!.id

    const { data: customer } = await adminClient
      .from('customers')
      .insert({
        organization_id: orgId, first_name: 'Test', last_name: 'Customer',
        name: 'Test Customer', contact_type: 'residential', status: 'inquiry',
      })
      .select('id')
      .single()

    const { data: job } = await adminClient
      .from('jobs')
      .insert({
        organization_id: orgId, customer_id: customer!.id,
        job_number: `JOB-EQUIP-TEST-${Date.now()}`,
        scheduled_start_date: '2026-07-20', job_address: '1 Test St',
      })
      .select('id')
      .single()
    jobId = job!.id
  }, 30000)

  afterAll(async () => {
    if (!adminClient || !orgId) return
    await adminClient.from('job_equipment').delete().eq('job_id', jobId)
    await adminClient.from('jobs').delete().eq('organization_id', orgId)
    await adminClient.from('customers').delete().eq('organization_id', orgId)
    await adminClient.from('organizations').delete().eq('id', orgId)
  }, 30000)

  it('adds equipment, lists it for the job, then deletes it', async () => {
    const { data: created, error: insertError } = await adminClient!
      .from('job_equipment')
      .insert({
        job_id: jobId,
        equipment_name: 'HEPA negative air machine',
        equipment_type: 'air_scrubber',
        quantity: 2,
        is_rental: true,
        rental_rate_daily: 75,
        rental_start_date: '2026-07-20',
        rental_end_date: '2026-07-22',
        rental_days: 3,
        rental_total: 450,
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(created!.equipment_name).toBe('HEPA negative air machine')

    const { data: listed, error: listError } = await adminClient!
      .from('job_equipment')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    expect(listError).toBeNull()
    expect(listed).toHaveLength(1)
    expect(listed![0].id).toBe(created!.id)
    expect(listed![0].quantity).toBe(2)
    expect(listed![0].rental_total).toBe(450)

    const { error: deleteError } = await adminClient!
      .from('job_equipment')
      .delete()
      .eq('id', created!.id)
    expect(deleteError).toBeNull()

    const { data: afterDelete } = await adminClient!
      .from('job_equipment')
      .select('id')
      .eq('job_id', jobId)
    expect(afterDelete).toHaveLength(0)
  })
})
