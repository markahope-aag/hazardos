/**
 * RLS Policy Tests
 *
 * Tests that Row Level Security policies correctly enforce multi-tenant
 * isolation. Each test verifies that:
 * 1. Users can access their own org's data
 * 2. Users CANNOT access other orgs' data
 * 3. Platform users can access cross-org data where applicable
 *
 * These tests use the Supabase service role client to set up test data,
 * then switch to user-scoped clients to verify RLS enforcement.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load .env.local for real Supabase credentials (test setup overrides URL to localhost)
const envResult = config({ path: '.env.local' })
const envVars = envResult.parsed || {}

// Use .env.local values directly — test/setup.ts overrides process.env to localhost
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Skip if no real Supabase credentials (CI without DB)
const canRunRlsTests = Boolean(supabaseUrl && serviceRoleKey && anonKey)

// Service role client bypasses RLS — used for setup/teardown only
const adminClient = canRunRlsTests
  ? createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
  : null

// Test org and user IDs — created in beforeAll, cleaned up in afterAll
let orgA: { id: string; name: string }
let orgB: { id: string; name: string }
let userA: { id: string; email: string }
let userB: { id: string; email: string }
let clientA: ReturnType<typeof createClient>
let clientB: ReturnType<typeof createClient>

// Helper: create a Supabase client authenticated as a specific user
function createUserClient(accessToken: string) {
  return createClient(supabaseUrl!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  })
}

describe.skipIf(!canRunRlsTests)('RLS Policy Tests', () => {
  beforeAll(async () => {
    if (!adminClient) return

    // Create two test organizations
    const { data: orgAData, error: orgAError } = await adminClient
      .from('organizations')
      .insert({ name: `RLS Test Org A ${Date.now()}` })
      .select('id, name')
      .single()
    if (orgAError) throw new Error(`Failed to create org A: ${orgAError.message}`)
    orgA = orgAData!

    const { data: orgBData, error: orgBError } = await adminClient
      .from('organizations')
      .insert({ name: `RLS Test Org B ${Date.now()}` })
      .select('id, name')
      .single()
    if (orgBError) throw new Error(`Failed to create org B: ${orgBError.message}`)
    orgB = orgBData!

    // Create test users via auth
    const emailA = `rls-test-a-${Date.now()}@hazardos-test.local`
    const emailB = `rls-test-b-${Date.now()}@hazardos-test.local`
    const password = 'RlsTest!2026Secure'

    const { data: authA, error: authAError } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    })
    if (authAError || !authA.user) throw new Error(`Failed to create user A: ${authAError?.message || 'no user returned'}`)
    userA = { id: authA.user.id, email: emailA }

    const { data: authB, error: authBError } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    })
    if (authBError || !authB.user) throw new Error(`Failed to create user B: ${authBError?.message || 'no user returned'}`)
    userB = { id: authB.user.id, email: emailB }

    // Assign profiles to orgs (full_name is a generated column from first_name + last_name)
    const { error: profileAError } = await adminClient.from('profiles').update({
      organization_id: orgA.id,
      role: 'admin',
      first_name: 'Test',
      last_name: 'User A',
    }).eq('id', userA.id)
    if (profileAError) throw new Error(`Failed to update profile A: ${profileAError.message}`)

    const { error: profileBError } = await adminClient.from('profiles').update({
      organization_id: orgB.id,
      role: 'admin',
      first_name: 'Test',
      last_name: 'User B',
    }).eq('id', userB.id)
    if (profileBError) throw new Error(`Failed to update profile B: ${profileBError.message}`)

    // Sign in as each user to get access tokens
    const tempClientA = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
    const { data: sessionA, error: signInAError } = await tempClientA.auth.signInWithPassword({ email: emailA, password })
    if (signInAError || !sessionA.session) throw new Error(`Failed to sign in user A: ${signInAError?.message || 'no session'}`)
    clientA = createUserClient(sessionA.session.access_token)

    const tempClientB = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
    const { data: sessionB, error: signInBError } = await tempClientB.auth.signInWithPassword({ email: emailB, password })
    if (signInBError || !sessionB.session) throw new Error(`Failed to sign in user B: ${signInBError?.message || 'no session'}`)
    clientB = createUserClient(sessionB.session.access_token)
  }, 30000)

  afterAll(async () => {
    if (!adminClient) return

    // Clean up test data (cascade will handle children)
    if (orgA?.id) {
      await adminClient.from('customers').delete().eq('organization_id', orgA.id)
      await adminClient.from('organizations').delete().eq('id', orgA.id)
    }
    if (orgB?.id) {
      await adminClient.from('customers').delete().eq('organization_id', orgB.id)
      await adminClient.from('organizations').delete().eq('id', orgB.id)
    }

    // Clean up test users
    if (userA?.id) await adminClient.auth.admin.deleteUser(userA.id)
    if (userB?.id) await adminClient.auth.admin.deleteUser(userB.id)
  }, 30000)

  // ========================================
  // CUSTOMERS TABLE
  // ========================================

  describe('customers table', () => {
    let customerA: string
    let customerB: string

    beforeAll(async () => {
      // Seed one customer per org via admin client
      const { data: cA, error: cAError } = await adminClient!
        .from('customers')
        .insert({
          organization_id: orgA.id,
          first_name: 'Alice',
          last_name: 'OrgA',
          name: 'Alice OrgA',
          contact_type: 'residential',
          status: 'inquiry',
          created_by: userA.id,
        })
        .select('id')
        .single()
      if (cAError) throw new Error(`Failed to create customer A: ${cAError.message}`)
      customerA = cA!.id

      const { data: cB, error: cBError } = await adminClient!
        .from('customers')
        .insert({
          organization_id: orgB.id,
          first_name: 'Bob',
          last_name: 'OrgB',
          name: 'Bob OrgB',
          contact_type: 'residential',
          status: 'inquiry',
          created_by: userB.id,
        })
        .select('id')
        .single()
      if (cBError) throw new Error(`Failed to create customer B: ${cBError.message}`)
      customerB = cB!.id
    })

    it('user A can read own org customers', async () => {
      const { data, error } = await clientA.from('customers').select('id').eq('organization_id', orgA.id)
      expect(error).toBeNull()
      expect(data!.some((c) => c.id === customerA)).toBe(true)
    })

    it('user A CANNOT read org B customers', async () => {
      const { data } = await clientA.from('customers').select('id').eq('organization_id', orgB.id)
      expect(data).toEqual([])
    })

    it('user A CANNOT read org B customer by ID', async () => {
      const { data } = await clientA.from('customers').select('id').eq('id', customerB).single()
      expect(data).toBeNull()
    })

    it('user B CANNOT update org A customer', async () => {
      const { error: _error } = await clientB
        .from('customers')
        .update({ first_name: 'Hacked' })
        .eq('id', customerA)
      // RLS blocks the update — either error or 0 rows affected
      const { data: check } = await adminClient!.from('customers').select('first_name').eq('id', customerA).single()
      expect(check!.first_name).toBe('Alice')
    })

    it('user B CANNOT delete org A customer', async () => {
      const { error: _error } = await clientB.from('customers').delete().eq('id', customerA)
      // Verify still exists
      const { data: check } = await adminClient!.from('customers').select('id').eq('id', customerA).single()
      expect(check).not.toBeNull()
    })
  })

  // ========================================
  // JOBS TABLE
  // ========================================

  describe('jobs table', () => {
    let jobA: string
    let jobCustomerA: string

    beforeAll(async () => {
      // Jobs require a customer_id FK — create a throwaway customer for the job
      const { data: jc, error: jcError } = await adminClient!
        .from('customers')
        .insert({
          organization_id: orgA.id,
          name: 'Job Customer A',
          first_name: 'Job',
          last_name: 'Customer A',
          contact_type: 'residential',
          status: 'inquiry',
          created_by: userA.id,
        })
        .select('id')
        .single()
      if (jcError) throw new Error(`Failed to create job customer: ${jcError.message}`)
      jobCustomerA = jc!.id

      const { data, error } = await adminClient!
        .from('jobs')
        .insert({
          organization_id: orgA.id,
          customer_id: jobCustomerA,
          job_number: `RLS-TEST-${Date.now()}`,
          name: 'RLS Test Job',
          status: 'scheduled',
          scheduled_start_date: '2026-06-01',
          job_address: '123 Test St',
          created_by: userA.id,
        })
        .select('id')
        .single()
      if (error) throw new Error(`Failed to create job A: ${error.message}`)
      jobA = data!.id
    })

    it('user A can read own org jobs', async () => {
      const { data } = await clientA.from('jobs').select('id').eq('id', jobA)
      expect(data).toHaveLength(1)
    })

    it('user B CANNOT read org A jobs', async () => {
      const { data } = await clientB.from('jobs').select('id').eq('id', jobA)
      expect(data).toEqual([])
    })

    it('user B CANNOT update org A job', async () => {
      await clientB.from('jobs').update({ name: 'Hacked' }).eq('id', jobA)
      const { data: check } = await adminClient!.from('jobs').select('name').eq('id', jobA).single()
      expect(check!.name).toBe('RLS Test Job')
    })
  })

  // ========================================
  // PROFILES TABLE
  // ========================================

  describe('profiles table', () => {
    it('user A can read own profile', async () => {
      const { data } = await clientA.from('profiles').select('id').eq('id', userA.id).single()
      expect(data).not.toBeNull()
    })

    it('user A can read profiles in own org', async () => {
      const { data } = await clientA.from('profiles').select('id').eq('organization_id', orgA.id)
      expect(data!.length).toBeGreaterThanOrEqual(1)
    })

    it('user A CANNOT read org B profiles', async () => {
      const { data } = await clientA.from('profiles').select('id').eq('organization_id', orgB.id)
      expect(data).toEqual([])
    })

    it('user B CANNOT update user A profile', async () => {
      await clientB.from('profiles').update({ first_name: 'Hacked' }).eq('id', userA.id)
      const { data } = await adminClient!.from('profiles').select('first_name').eq('id', userA.id).single()
      expect(data!.first_name).toBe('Test')
    })
  })

  // ========================================
  // SITE SURVEYS TABLE
  // ========================================

  describe('site_surveys table', () => {
    let surveyA: string

    beforeAll(async () => {
      const { data, error } = await adminClient!
        .from('site_surveys')
        .insert({
          organization_id: orgA.id,
          job_name: 'RLS Survey Test',
          customer_name: 'Test',
          site_address: '123 Test St',
          site_city: 'Test',
          site_state: 'TX',
          site_zip: '75001',
          hazard_type: 'asbestos',
          status: 'draft',
        })
        .select('id')
        .single()
      if (error) throw new Error(`Failed to create survey A: ${error.message}`)
      surveyA = data!.id
    })

    it('user A can read own org surveys', async () => {
      const { data } = await clientA.from('site_surveys').select('id').eq('id', surveyA)
      expect(data).toHaveLength(1)
    })

    it('user B CANNOT read org A surveys', async () => {
      const { data } = await clientB.from('site_surveys').select('id').eq('id', surveyA)
      expect(data).toEqual([])
    })
  })

  // ========================================
  // NOTIFICATIONS TABLE (user-scoped, not org-scoped)
  // ========================================

  describe('notifications table', () => {
    let notifA: string
    let notifB: string

    beforeAll(async () => {
      const { data: nA, error: nAError } = await adminClient!
        .from('notifications')
        .insert({
          organization_id: orgA.id,
          user_id: userA.id,
          type: 'system',
          title: 'Test notification for A',
        })
        .select('id')
        .single()
      if (nAError) throw new Error(`Failed to create notification A: ${nAError.message}`)
      notifA = nA!.id

      const { data: nB, error: nBError } = await adminClient!
        .from('notifications')
        .insert({
          organization_id: orgB.id,
          user_id: userB.id,
          type: 'system',
          title: 'Test notification for B',
        })
        .select('id')
        .single()
      if (nBError) throw new Error(`Failed to create notification B: ${nBError.message}`)
      notifB = nB!.id
    })

    it('user A can read own notifications', async () => {
      const { data } = await clientA.from('notifications').select('id').eq('id', notifA)
      expect(data).toHaveLength(1)
    })

    it('user A CANNOT read user B notifications', async () => {
      const { data } = await clientA.from('notifications').select('id').eq('id', notifB)
      expect(data).toEqual([])
    })

    it('user A CANNOT delete user B notifications', async () => {
      await clientA.from('notifications').delete().eq('id', notifB)
      const { data } = await adminClient!.from('notifications').select('id').eq('id', notifB).single()
      expect(data).not.toBeNull()
    })
  })

  // ========================================
  // INVOICES TABLE
  // ========================================

  describe('invoices table', () => {
    let invoiceA: string
    let invoiceCustomerA: string

    beforeAll(async () => {
      // Invoices require a customer_id FK — create a throwaway customer
      const { data: ic, error: icError } = await adminClient!
        .from('customers')
        .insert({
          organization_id: orgA.id,
          name: 'Invoice Customer A',
          first_name: 'Invoice',
          last_name: 'Customer A',
          contact_type: 'residential',
          status: 'inquiry',
          created_by: userA.id,
        })
        .select('id')
        .single()
      if (icError) throw new Error(`Failed to create invoice customer: ${icError.message}`)
      invoiceCustomerA = ic!.id

      const { data, error } = await adminClient!
        .from('invoices')
        .insert({
          organization_id: orgA.id,
          customer_id: invoiceCustomerA,
          invoice_number: `RLS-INV-${Date.now()}`,
          due_date: '2026-07-01',
          status: 'draft',
          subtotal: 1000,
          total: 1000,
          created_by: userA.id,
        })
        .select('id')
        .single()
      if (error) throw new Error(`Failed to create invoice A: ${error.message}`)
      invoiceA = data!.id
    })

    it('user A can read own org invoices', async () => {
      const { data } = await clientA.from('invoices').select('id').eq('id', invoiceA)
      expect(data).toHaveLength(1)
    })

    it('user B CANNOT read org A invoices', async () => {
      const { data } = await clientB.from('invoices').select('id').eq('id', invoiceA)
      expect(data).toEqual([])
    })
  })

  // ========================================
  // PRICING TABLES (org-scoped)
  // ========================================

  describe('pricing tables', () => {
    let laborRateA: string

    beforeAll(async () => {
      const { data, error } = await adminClient!
        .from('labor_rates')
        .insert({
          organization_id: orgA.id,
          name: 'RLS Test Rate',
          rate_per_day: 400,
        })
        .select('id')
        .single()
      if (error) throw new Error(`Failed to create labor rate: ${error.message}`)
      laborRateA = data!.id
    })

    it('user A can read own org labor rates', async () => {
      const { data } = await clientA.from('labor_rates').select('id').eq('id', laborRateA)
      expect(data).toHaveLength(1)
    })

    it('user B CANNOT read org A labor rates', async () => {
      const { data } = await clientB.from('labor_rates').select('id').eq('id', laborRateA)
      expect(data).toEqual([])
    })

    it('user B CANNOT insert into org A labor rates', async () => {
      const { error } = await clientB
        .from('labor_rates')
        .insert({ organization_id: orgA.id, name: 'Injected', rate_per_day: 999 })
      expect(error).not.toBeNull()
    })
  })

  // ========================================
  // CROSS-TABLE ORG ISOLATION
  // ========================================

  describe('cross-table org isolation', () => {
    // A bare `expect(foreignOrgs).toEqual([])` inside a loop reports only
    // "expected [ Array(1) ] to deeply equal []" — it names neither the table
    // that leaked nor the org it leaked from, which is most of what you need
    // to tell a policy bug from stray fixture data. Label the assertion.
    const CORE_TABLES = ['customers', 'jobs', 'site_surveys', 'estimates', 'proposals'] as const

    async function foreignRowsFor(client: typeof clientA, ownOrgId: string, table: string) {
      const { data, error } = await client.from(table).select('organization_id')
      if (error) throw new Error(`${table}: query failed — ${error.message}`)
      return (data || [])
        .filter((row: { organization_id: string }) => row.organization_id !== ownOrgId)
        .map((row: { organization_id: string }) => row.organization_id)
    }

    it('user A list queries only return own org data across all core tables', async () => {
      for (const table of CORE_TABLES) {
        const foreign = await foreignRowsFor(clientA, orgA.id, table)
        expect(foreign, `${table} leaked rows from org(s): ${[...new Set(foreign)].join(', ')}`).toEqual([])
      }
    })

    it('user B list queries only return own org data across all core tables', async () => {
      for (const table of CORE_TABLES) {
        const foreign = await foreignRowsFor(clientB, orgB.id, table)
        expect(foreign, `${table} leaked rows from org(s): ${[...new Set(foreign)].join(', ')}`).toEqual([])
      }
    })
  })

  // ========================================
  // PUBLIC / ANON LOCKDOWN
  // Regression guard for the "USING(true) / unvalidated public-token" RLS class
  // of bug. The anon key ships in every browser bundle, so ANY row it can read
  // is world-readable. Public token flows (feedback, proposal portal) must go
  // through SECURITY DEFINER RPCs, never raw-table anon SELECT.
  // ========================================

  describe('public anon lockdown', () => {
    const anon = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })

    // Tables that must never yield rows to an unauthenticated caller.
    const lockedTables = [
      'feedback_surveys',
      'proposals',
      'invoices',
      'invoice_line_items',
      'customers',
      'opportunities',
      'jobs',
    ] as const

    for (const table of lockedTables) {
      it(`anon CANNOT read ${table}`, async () => {
        const { data, error } = await anon.from(table).select('id').limit(1)
        // Acceptable: RLS returns zero rows, OR the query is rejected outright.
        // Failure = actual rows returned to an unauthenticated caller.
        const leaked = !error && (data ?? []).length > 0
        expect(leaked).toBe(false)
      })
    }

    it('anon can still reach the public feedback survey via its SECURITY DEFINER RPC', async () => {
      // Public token flow must remain callable by anon (it validates the token
      // internally). An unknown token returns a graceful "not found" shape, NOT
      // a permission error — that would mean we broke the customer-facing route.
      const { error } = await anon.rpc('get_feedback_survey_by_token', {
        p_token: '00000000-0000-0000-0000-000000000000',
      })
      expect(error).toBeNull()
    })
  })

  // ========================================
  // PROPOSAL PORTAL TOKEN FLOW
  // Regression guard for SEC22. The portal used to read proposals straight off
  // the table, permitted by an RLS policy that only asserted "this row has some
  // unexpired token" — never that the caller held it. Any authenticated user of
  // any tenant could therefore list every tokened proposal and read its
  // access_token, which is enough to sign another company's contract.
  //
  // The old cross-table isolation test did catch this, but only when a tokened
  // proposal happened to exist at that moment, so it read as flake. These tests
  // create the row themselves and fail deterministically.
  // ========================================

  describe('proposal portal token flow', () => {
    const anon = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
    const token = `rls-test-token-${Date.now()}`
    let proposalId: string | undefined

    beforeAll(async () => {
      if (!adminClient) return

      const estimateId = crypto.randomUUID()
      const { error: estimateError } = await adminClient.from('estimates').insert({
        id: estimateId,
        organization_id: orgA.id,
        estimate_number: `RLS-EST-${Date.now()}`,
        estimate_root_id: estimateId, // self-referencing FK: the root of its own version chain
        status: 'sent',
        total: 4321,
      })
      if (estimateError) throw new Error(`Failed to create estimate: ${estimateError.message}`)

      const { data, error } = await adminClient
        .from('proposals')
        .insert({
          organization_id: orgA.id,
          estimate_id: estimateId,
          proposal_number: `RLS-PROP-${Date.now()}`,
          status: 'sent',
          access_token: token,
          access_token_expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
        .select('id')
        .single()
      if (error) throw new Error(`Failed to create proposal: ${error.message}`)
      proposalId = data!.id
    }, 30000)

    afterAll(async () => {
      if (!adminClient || !proposalId) return
      await adminClient.from('proposals').delete().eq('id', proposalId)
    })

    it('a user in another org CANNOT see the tokened proposal', async () => {
      const { data } = await clientB.from('proposals').select('id, organization_id, access_token')
      const foreign = (data || []).filter(
        (row: { organization_id: string }) => row.organization_id !== orgB.id
      )
      expect(foreign, 'org B read org A proposals — the SEC22 policy is back').toEqual([])
    })

    it('anon CANNOT read the tokened proposal off the table', async () => {
      const { data, error } = await anon.from('proposals').select('id').eq('access_token', token)
      const leaked = !error && (data ?? []).length > 0
      expect(leaked).toBe(false)
    })

    it('anon CAN read it through the RPC when holding the token', async () => {
      const { data, error } = await anon.rpc('get_proposal_by_token', { p_token: token })
      expect(error).toBeNull()
      expect(data?.id).toBe(proposalId)
    })

    it('the RPC never hands back the access token itself', async () => {
      const { data } = await anon.rpc('get_proposal_by_token', { p_token: token })
      expect(Object.keys(data ?? {})).not.toContain('access_token')
    })

    it('a wrong token returns nothing', async () => {
      const { data, error } = await anon.rpc('get_proposal_by_token', {
        p_token: 'definitely-not-the-token',
      })
      expect(error).toBeNull()
      expect(data).toBeNull()
    })
  })

  // ========================================
  // PRIVILEGE ESCALATION GUARDS
  // Regression cover for SEC23 and SEC26 — two routes to the same end state,
  // total platform compromise.
  //
  // SEC23: profiles UPDATE had USING (id = auth.uid()) with no WITH CHECK, so
  // only `id` was pinned. A viewer could PATCH its own row to
  // role='platform_owner' with the anon key that ships in the browser bundle.
  // SEC26: tenant_invitations.role had no CHECK and handle_new_user() copied it
  // verbatim, so a tenant admin could invite a burner address as platform_owner.
  //
  // Both fixes were initially INERT and applied without error — the first guard
  // branched on current_user inside a SECURITY DEFINER function (where that is
  // the owner, not the caller). These tests exist because "the migration
  // applied" proved nothing.
  // ========================================

  describe('privilege escalation guards', () => {
    it('a user CANNOT change their own role', async () => {
      const { error } = await clientA
        .from('profiles')
        .update({ role: 'platform_owner' })
        .eq('id', userA.id)
      expect(error, 'a user was able to rewrite their own role — SEC23 is back').not.toBeNull()

      const { data } = await adminClient!.from('profiles').select('role').eq('id', userA.id).single()
      expect(data!.role).toBe('admin')
    })

    it('a user CANNOT move themselves into another organization', async () => {
      const { error } = await clientA
        .from('profiles')
        .update({ organization_id: orgB.id })
        .eq('id', userA.id)
      expect(error, 'a user hopped tenants by rewriting organization_id — SEC23 is back').not.toBeNull()

      const { data } = await adminClient!
        .from('profiles')
        .select('organization_id')
        .eq('id', userA.id)
        .single()
      expect(data!.organization_id).toBe(orgA.id)
    })

    it('a user CANNOT grant themselves platform access', async () => {
      const { error } = await clientA
        .from('profiles')
        .update({ is_platform_user: true })
        .eq('id', userA.id)
      expect(error).not.toBeNull()
    })

    it('a user CAN still edit their own name', async () => {
      // The guard must pin the three privileged columns without freezing the
      // profile — ordinary self-service edits have to keep working.
      const { error } = await clientA
        .from('profiles')
        .update({ first_name: 'Renamed' })
        .eq('id', userA.id)
      expect(error, 'the escalation guard broke ordinary profile edits').toBeNull()

      const { data } = await adminClient!
        .from('profiles')
        .select('first_name')
        .eq('id', userA.id)
        .single()
      expect(data!.first_name).toBe('Renamed')
    })

    it('an invitation CANNOT carry a platform role', async () => {
      const { error } = await adminClient!.from('tenant_invitations').insert({
        organization_id: orgA.id,
        email: `rls-esc-${Date.now()}@hazardos-test.local`,
        role: 'platform_owner',
        invited_by: userA.id,
        token: `rls-esc-tok-${Date.now()}`,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      // Service role bypasses RLS but not CHECK constraints, which is the point:
      // the restriction has to live in the database, not in the API's zod schema.
      expect(error, 'a platform-role invitation was accepted — SEC26 is back').not.toBeNull()
      expect(error!.message).toContain('tenant_invitations_role_not_privileged')
    })
  })

  // ========================================
  // DESTRUCTIVE CASCADE-DELETE GUARDS
  // A contact deletes-cascade through invoices, jobs and asbestos disposal
  // manifests; a survey cascades through estimates to signed proposals. Both
  // delete paths were unguarded, so one interactive mis-click erased
  // legally-retained records. BEFORE DELETE triggers block an interactive user
  // from deleting a row with those dependents, while leaving the service role
  // (org teardown, admin cleanup) able to force it.
  // ========================================

  describe('destructive delete guards', () => {
    it('a user CANNOT delete a contact that has linked jobs', async () => {
      const { data: cust } = await adminClient!
        .from('customers')
        .insert({ organization_id: orgA.id, name: 'Guarded Contact' })
        .select('id')
        .single()
      await adminClient!.from('jobs').insert({
        organization_id: orgA.id,
        customer_id: cust!.id,
        job_number: `GUARD-${Date.now()}`,
        job_address: '1 Guard St',
        status: 'scheduled',
        scheduled_start_date: '2026-07-01',
      })

      const { error } = await clientA.from('customers').delete().eq('id', cust!.id)
      expect(error, 'a contact with a job was deleted — the cascade guard is gone').not.toBeNull()

      // The contact must still exist.
      const { data: still } = await adminClient!.from('customers').select('id').eq('id', cust!.id).maybeSingle()
      expect(still?.id).toBe(cust!.id)

      // cleanup (service role can force past the guard)
      await adminClient!.from('jobs').delete().eq('customer_id', cust!.id)
      await adminClient!.from('customers').delete().eq('id', cust!.id)
    })

    it('a user CAN delete a contact with no financial dependents', async () => {
      const { data: cust } = await adminClient!
        .from('customers')
        .insert({ organization_id: orgA.id, name: 'Deletable Contact' })
        .select('id')
        .single()

      const { error } = await clientA.from('customers').delete().eq('id', cust!.id)
      expect(error, 'the guard blocked a contact that had no dependents').toBeNull()

      const { data: gone } = await adminClient!.from('customers').select('id').eq('id', cust!.id).maybeSingle()
      expect(gone).toBeNull()
    })
  })
})
