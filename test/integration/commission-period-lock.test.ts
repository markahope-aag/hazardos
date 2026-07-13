/**
 * CO6 regression guard: closing a commission period must block edits to any
 * earning dated in that month, enforced by the enforce_commission_period_lock
 * DB trigger. Runs against the real DB because the enforcement lives entirely
 * in Postgres — a mocked client can't exercise the trigger.
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

describe.skipIf(!canRun)('commission period lock (CO6)', () => {
  let orgId: string
  let earningId: string
  let planId: string
  const PERIOD = '2026-03'

  beforeAll(async () => {
    if (!s) return
    const { data: cust } = await s.from('customers').select('organization_id').limit(1).single()
    orgId = cust!.organization_id
    const { data: prof } = await s.from('profiles').select('id').eq('organization_id', orgId).limit(1).single()
    let { data: plan } = await s.from('commission_plans').select('id').eq('organization_id', orgId).limit(1).maybeSingle()
    if (!plan) {
      const { data: np } = await s.from('commission_plans')
        .insert({ organization_id: orgId, name: 'CO6 Test Plan', commission_type: 'percentage', base_rate: 5, applies_to: 'won' })
        .select('id').single()
      plan = np
    }
    planId = plan!.id
    const { data: e } = await s.from('commission_earnings')
      .insert({ organization_id: orgId, user_id: prof!.id, plan_id: planId, base_amount: 1000, commission_rate: 5, commission_amount: 50, status: 'pending', earning_date: `${PERIOD}-15` })
      .select('id').single()
    earningId = e!.id
  }, 30000)

  afterAll(async () => {
    if (!s || !orgId) return
    // Reopen first so cleanup deletes aren't blocked by the lock.
    await s.from('commission_periods').delete().eq('organization_id', orgId).eq('period', PERIOD)
    await s.from('commission_earnings').delete().eq('id', earningId)
  }, 30000)

  it('blocks edits to an earning once its period is closed', async () => {
    await s!.from('commission_periods').upsert(
      { organization_id: orgId, period: PERIOD, status: 'closed', closed_at: new Date().toISOString() },
      { onConflict: 'organization_id,period' },
    )

    const { error } = await s!.from('commission_earnings').update({ status: 'approved' }).eq('id', earningId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/closed/i)
  })

  it('allows edits again after the period is reopened', async () => {
    await s!.from('commission_periods').update({ status: 'open', closed_at: null }).eq('organization_id', orgId).eq('period', PERIOD)

    const { error } = await s!.from('commission_earnings').update({ status: 'approved' }).eq('id', earningId)
    expect(error).toBeNull()
  })
})
