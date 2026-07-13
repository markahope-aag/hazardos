/**
 * Regression guard for CO1/CO2: the commissions page failed to render its
 * earnings table because CommissionService.getEarnings embedded
 * `user:profiles(...)` with no FK hint. commission_earnings has TWO foreign
 * keys to profiles (user_id and approved_by), so PostgREST rejected the
 * ambiguous embed with "more than one relationship was found" — a runtime
 * error invisible to the mocked service tests.
 *
 * Runs the exact select string the service uses against the real DB, so it
 * fails immediately if the hint regresses back to the bare `profiles(...)`.
 */

import { describe, it, expect } from 'vitest'
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

describe.skipIf(!canRunLiveDbTests)('commission_earnings profile embed (CO1/CO2)', () => {
  it('resolves the user embed via the explicit user_id FK hint', async () => {
    const { error } = await adminClient!
      .from('commission_earnings')
      .select(
        '*, user:profiles!commission_earnings_user_id_fkey(id, full_name), plan:commission_plans(*)',
        { count: 'exact' },
      )
      .order('earning_date', { ascending: false })
      .limit(1)

    // The bug produced a PGRST error; a working hint returns no error even
    // when the table is empty.
    expect(error).toBeNull()
  })

  it('confirms the bare, un-hinted embed is genuinely ambiguous', async () => {
    // Proves the hint is load-bearing, not incidental — without it PostgREST
    // still reports the two-FK ambiguity.
    const { error } = await adminClient!
      .from('commission_earnings')
      .select('*, user:profiles(id, full_name)')
      .limit(1)

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/more than one relationship|multiple/i)
  })
})
