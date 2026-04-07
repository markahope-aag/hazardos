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
          status: 'lead',
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
          status: 'lead',
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
          status: 'lead',
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
          status: 'lead',
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
          rate_per_hour: 50,
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
        .insert({ organization_id: orgA.id, name: 'Injected', rate_per_hour: 999 })
      expect(error).not.toBeNull()
    })
  })

  // ========================================
  // CROSS-TABLE ORG ISOLATION
  // ========================================

  describe('cross-table org isolation', () => {
    it('user A list queries only return own org data across all core tables', async () => {
      const tables = ['customers', 'jobs', 'site_surveys', 'estimates', 'proposals'] as const

      for (const table of tables) {
        const { data } = await clientA.from(table).select('organization_id')
        const foreignOrgs = (data || []).filter((row: { organization_id: string }) => row.organization_id !== orgA.id)
        expect(foreignOrgs).toEqual([])
      }
    })

    it('user B list queries only return own org data across all core tables', async () => {
      const tables = ['customers', 'jobs', 'site_surveys', 'estimates', 'proposals'] as const

      for (const table of tables) {
        const { data } = await clientB.from(table).select('organization_id')
        const foreignOrgs = (data || []).filter((row: { organization_id: string }) => row.organization_id !== orgB.id)
        expect(foreignOrgs).toEqual([])
      }
    })
  })
})
