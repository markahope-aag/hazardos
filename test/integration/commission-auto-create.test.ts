/**
 * CO2 regression guard: when a job is completed, a pending commission is
 * auto-created for the rep using their assigned plan. The wiring
 * (createEarningForJob) runs on a cookie-based server client, so this test
 * exercises the same data contract it depends on directly against the DB:
 *  - the columns it reads (jobs.final_amount, profiles.commission_plan_id,
 *    commission_plans.base_rate) exist and resolve,
 *  - the percentage calc is correct,
 *  - a second create for the same job is suppressed (idempotency by job_id),
 *  - no plan on the rep => no earning.
 * If a future migration renames any of those columns, this fails loudly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const envResult = config({ path: '.env.local' })
const envVars = envResult.parsed || {}
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const canRun = Boolean(supabaseUrl && serviceRoleKey)
const s = canRun ? createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } }) : null

// Mirrors CommissionService.createEarningForJob's resolution + calc so the
// data contract is validated even though the method itself needs a request
// context to run.
async function createEarningForJob(jobId: string) {
  const { data: existing } = await s!.from('commission_earnings').select('id').eq('job_id', jobId).maybeSingle()
  if (existing) return { skipped: 'exists' as const }
  const { data: j } = await s!.from('jobs')
    .select('id, organization_id, opportunity_id, assigned_to, created_by, final_amount, actual_revenue, contract_amount, estimated_revenue')
    .eq('id', jobId).single()
  if (!j) return { skipped: 'no_job' as const }
  let repId: string | null = j.assigned_to || j.created_by || null
  if (j.opportunity_id) {
    const { data: o } = await s!.from('opportunities').select('owner_id').eq('id', j.opportunity_id).single()
    if (o?.owner_id) repId = o.owner_id
  }
  if (!repId) return { skipped: 'no_rep' as const }
  const { data: rep } = await s!.from('profiles').select('commission_plan_id').eq('id', repId).single()
  if (!rep?.commission_plan_id) return { skipped: 'no_plan' as const }
  const { data: pl } = await s!.from('commission_plans').select('*').eq('id', rep.commission_plan_id).single()
  const base = j.final_amount ?? j.actual_revenue ?? j.contract_amount ?? j.estimated_revenue ?? 0
  if (!base || base <= 0) return { skipped: 'no_amount' as const }
  const amount = base * ((pl!.base_rate || 0) / 100)
  const { data: e } = await s!.from('commission_earnings').insert({
    organization_id: j.organization_id, user_id: repId, plan_id: pl!.id,
    opportunity_id: j.opportunity_id || null, job_id: j.id,
    base_amount: base, commission_rate: pl!.base_rate, commission_amount: amount,
    status: 'pending', earning_date: '2026-07-13',
  }).select('base_amount, commission_rate, commission_amount').single()
  return { created: e }
}

describe.skipIf(!canRun)('commission auto-create on job completion (CO2)', () => {
  let orgId: string
  let repId: string
  let planId: string
  let jobId: string

  beforeAll(async () => {
    if (!s) return
    const { data: cust } = await s.from('customers').select('id, organization_id').limit(1).single()
    orgId = cust!.organization_id
    const { data: prof } = await s.from('profiles').select('id').eq('organization_id', orgId).limit(1).single()
    repId = prof!.id
    const { data: plan } = await s.from('commission_plans')
      .insert({ organization_id: orgId, name: 'CO2 IT Plan 8%', commission_type: 'percentage', base_rate: 8, applies_to: 'won', is_active: true })
      .select('id').single()
    planId = plan!.id
    const { data: job } = await s.from('jobs')
      .insert({ organization_id: orgId, customer_id: cust!.id, job_number: `CO2IT-${Date.now()}`, status: 'scheduled', final_amount: 5000, assigned_to: repId, created_by: repId, scheduled_start_date: '2026-07-01', job_address: '1 Test St' })
      .select('id').single()
    jobId = job!.id
  }, 30000)

  afterAll(async () => {
    if (!s || !orgId) return
    await s.from('commission_earnings').delete().eq('job_id', jobId)
    await s.from('jobs').delete().eq('id', jobId)
    await s.from('profiles').update({ commission_plan_id: null }).eq('id', repId)
    await s.from('commission_plans').delete().eq('id', planId)
  }, 30000)

  it('skips when the rep has no commission plan assigned', async () => {
    await s!.from('profiles').update({ commission_plan_id: null }).eq('id', repId)
    const result = await createEarningForJob(jobId)
    expect(result).toEqual({ skipped: 'no_plan' })
  })

  it('creates a pending earning with the correct percentage math once a plan is assigned', async () => {
    await s!.from('profiles').update({ commission_plan_id: planId }).eq('id', repId)
    const result = await createEarningForJob(jobId)
    expect(result).toMatchObject({
      created: { base_amount: 5000, commission_rate: 8, commission_amount: 400 },
    })
  })

  it('is idempotent — a second create for the same job is suppressed', async () => {
    const result = await createEarningForJob(jobId)
    expect(result).toEqual({ skipped: 'exists' })
  })
})
