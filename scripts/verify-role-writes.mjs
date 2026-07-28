#!/usr/bin/env node
/**
 * Post-Pattern-B regression probe.
 *
 * The 24 July role-scoping sweep (20260724152045 / 20260724152124) added role
 * predicates to write policies on ~54 tables, and split several FOR ALL
 * policies into SELECT + write halves. That landed AFTER the 20-21 July QA
 * pass, so no UI run has exercised it.
 *
 * Two ways it could have gone wrong:
 *   1. A write a role legitimately needs is now refused (broken workflow).
 *   2. A FOR ALL split dropped read access for viewer/technician (blank app).
 *
 * This signs in as each QA tester role with the PUBLIC ANON KEY — the same
 * path the browser takes, so RLS applies exactly as it would in the app — and
 * probes both. Every write is rolled back with the service client.
 *
 * Usage: node scripts/verify-role-writes.mjs
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

function readEnv() {
  const raw = readFileSync('.env.local', 'utf8')
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const env = readEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = 'HazardOS-QA-2026!'
const ACME_ORG_ID = '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f'

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

const ROLES = [
  { role: 'tenant_owner', email: 'roy.tolosa+owner@asymmetric.pro' },
  { role: 'admin', email: 'roy.tolosa+admin@asymmetric.pro' },
  { role: 'estimator', email: 'roy.tolosa+estimator@asymmetric.pro' },
  { role: 'technician', email: 'roy.tolosa+technician@asymmetric.pro' },
  { role: 'viewer', email: 'roy.tolosa+viewer@asymmetric.pro' },
]

const TENANT_ADMIN = ['tenant_owner', 'admin']
const TENANT_WRITE = [...TENANT_ADMIN, 'estimator']
const TENANT_FIELD = [...TENANT_WRITE, 'technician']
const ALL_ROLES = [...TENANT_FIELD, 'viewer']

// Rows the probes lean on. Resolved once, with the service client.
const ctx = {}

async function loadContext() {
  const pick = async (table, extra = (q) => q) => {
    const { data } = await extra(
      admin.from(table).select('id').eq('organization_id', ACME_ORG_ID),
    ).limit(1)
    return data?.[0]?.id ?? null
  }
  ctx.customerId = await pick('customers')
  ctx.jobId = await pick('jobs')
  ctx.surveyId = await pick('site_surveys')
  ctx.stageId = await pick('pipeline_stages')
  if (!ctx.customerId || !ctx.jobId || !ctx.surveyId || !ctx.stageId) {
    throw new Error('Acme org is missing a customer/job/survey/pipeline stage to probe against.')
  }
}

/**
 * Each probe: attempt the write as `client`, report whether it landed, and
 * undo it. `expect` lists the roles that SHOULD succeed.
 */
const WRITE_PROBES = [
  {
    name: 'customers INSERT (new contact)',
    tier: 'TENANT_WRITE',
    expect: TENANT_WRITE,
    run: async (client) => {
      const { data, error } = await client
        .from('customers')
        .insert({
          organization_id: ACME_ORG_ID,
          name: 'RLSPROBE Temp',
          first_name: 'RLSPROBE',
          last_name: 'Temp',
          contact_type: 'residential',
          address_line1: '1 Probe Way',
          city: 'Denver',
          state: 'CO',
          zip: '80202',
        })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'customers' }
    },
  },
  {
    name: 'opportunities INSERT (pipeline card)',
    tier: 'TENANT_WRITE',
    expect: TENANT_WRITE,
    run: async (client) => {
      const { data, error } = await client
        .from('opportunities')
        .insert({
          organization_id: ACME_ORG_ID,
          customer_id: ctx.customerId,
          name: 'RLSPROBE Opportunity',
          stage_id: ctx.stageId,
        })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'opportunities' }
    },
  },
  {
    name: 'estimates INSERT (build an estimate)',
    tier: 'TENANT_WRITE',
    expect: TENANT_WRITE,
    run: async (client) => {
      const { data, error } = await client
        .from('estimates')
        .insert({
          organization_id: ACME_ORG_ID,
          customer_id: ctx.customerId,
          estimate_number: `RLSPROBE-${randomUUID().slice(0, 8)}`,
          status: 'draft',
        })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'estimates' }
    },
  },
  {
    name: 'jobs UPDATE (edit internal notes)',
    tier: 'TENANT_WRITE',
    expect: TENANT_WRITE,
    run: async (client) => {
      const { data: before } = await admin
        .from('jobs')
        .select('internal_notes')
        .eq('id', ctx.jobId)
        .single()
      const { data, error } = await client
        .from('jobs')
        .update({ internal_notes: `RLSPROBE ${randomUUID().slice(0, 6)}` })
        .eq('id', ctx.jobId)
        .select('id')
      // Restore whatever was there before, regardless of outcome.
      await admin
        .from('jobs')
        .update({ internal_notes: before?.internal_notes ?? null })
        .eq('id', ctx.jobId)
      return { ok: !error && !!data?.length, error }
    },
  },
  {
    name: 'jobs UPDATE status (field crew closes a job)',
    tier: 'TENANT_WRITE',
    expect: TENANT_WRITE,
    note: 'technician is deliberately excluded — see findings',
    run: async (client) => {
      const { data: before } = await admin
        .from('jobs')
        .select('status')
        .eq('id', ctx.jobId)
        .single()
      const next = before?.status === 'in_progress' ? 'scheduled' : 'in_progress'
      const { data, error } = await client
        .from('jobs')
        .update({ status: next })
        .eq('id', ctx.jobId)
        .select('id')
      await admin.from('jobs').update({ status: before?.status }).eq('id', ctx.jobId)
      return { ok: !error && !!data?.length, error }
    },
  },
  {
    name: 'site_surveys INSERT (start a field survey)',
    tier: 'TENANT_FIELD',
    expect: TENANT_FIELD,
    run: async (client) => {
      const { data, error } = await client
        .from('site_surveys')
        .insert({
          organization_id: ACME_ORG_ID,
          job_name: 'RLSPROBE Survey',
          customer_name: 'RLSPROBE',
          site_address: '1 Probe Way',
          site_city: 'Denver',
          site_state: 'CO',
          site_zip: '80202',
          hazard_type: 'asbestos',
          status: 'draft',
        })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'site_surveys' }
    },
  },
  {
    name: 'site_surveys UPDATE (wizard saves a draft)',
    tier: 'TENANT_FIELD',
    expect: TENANT_FIELD,
    run: async (client) => {
      const { data: before } = await admin
        .from('site_surveys')
        .select('technician_notes')
        .eq('id', ctx.surveyId)
        .single()
      const { data, error } = await client
        .from('site_surveys')
        .update({ technician_notes: `RLSPROBE ${randomUUID().slice(0, 6)}` })
        .eq('id', ctx.surveyId)
        .select('id')
      await admin
        .from('site_surveys')
        .update({ technician_notes: before?.technician_notes ?? null })
        .eq('id', ctx.surveyId)
      return { ok: !error && !!data?.length, error }
    },
  },
  {
    name: 'survey_photos INSERT (field photo capture)',
    tier: 'TENANT_FIELD',
    expect: TENANT_FIELD,
    run: async (client) => {
      const { data, error } = await client
        .from('survey_photos')
        .insert({
          organization_id: ACME_ORG_ID,
          site_survey_id: ctx.surveyId,
          category: 'hazard',
          media_type: 'image',
          original_r2_key: `probe/${randomUUID()}.jpg`,
          expires_at: new Date(Date.now() + 86400_000).toISOString(),
        })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'survey_photos' }
    },
  },
  {
    name: 'job_time_entries INSERT (crew logs hours)',
    tier: 'TENANT_FIELD',
    expect: TENANT_FIELD,
    run: async (client) => {
      const { data, error } = await client
        .from('job_time_entries')
        .insert({ job_id: ctx.jobId, hours: 1, work_date: '2026-07-28' })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'job_time_entries' }
    },
  },
  {
    name: 'job_notes INSERT (crew note from the field)',
    tier: 'TENANT_FIELD',
    expect: TENANT_FIELD,
    run: async (client) => {
      const { data, error } = await client
        .from('job_notes')
        .insert({ job_id: ctx.jobId, content: 'RLSPROBE' })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'job_notes' }
    },
  },
  {
    name: 'labor_rates INSERT (pricing config)',
    tier: 'TENANT_ADMIN',
    expect: TENANT_ADMIN,
    run: async (client) => {
      const { data, error } = await client
        .from('labor_rates')
        .insert({ organization_id: ACME_ORG_ID, name: 'RLSPROBE', rate_per_day: 1 })
        .select('id')
      return { ok: !error && !!data?.length, error, cleanup: data?.[0]?.id, table: 'labor_rates' }
    },
  },
]

// The FOR ALL -> SELECT/write split is the other way this migration could
// have broken things: silently removing read access.
const READ_PROBES = [
  'customers',
  'companies',
  'opportunities',
  'jobs',
  'estimates',
  'invoices',
  'proposals',
  'site_surveys',
  'survey_photos',
  'job_notes',
  'job_time_entries',
  'pipeline_stages',
  'labor_rates',
  'pricing_settings',
]

async function signIn(email) {
  const client = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return { client, userId: data.user.id }
}

async function cleanup(result) {
  if (!result?.cleanup || !result?.table) return
  await admin.from(result.table).delete().eq('id', result.cleanup)
}

const findings = []

async function main() {
  await loadContext()
  console.log(`Probing against Acme org ${ACME_ORG_ID}\n`)

  const writeGrid = {}
  const readGrid = {}

  for (const { role, email } of ROLES) {
    console.log(`\n=== ${role} (${email}) ===`)
    const { client } = await signIn(email)

    console.log('  -- writes --')
    for (const probe of WRITE_PROBES) {
      let result
      try {
        result = await probe.run(client)
      } catch (err) {
        result = { ok: false, error: { message: err.message } }
      }
      await cleanup(result)

      const shouldPass = probe.expect.includes(role)
      const correct = result.ok === shouldPass
      writeGrid[probe.name] ??= {}
      writeGrid[probe.name][role] = result.ok

      const verdict = correct ? 'ok' : result.ok ? 'UNEXPECTED WRITE' : 'BLOCKED'
      console.log(
        `    ${correct ? '✓' : '✗'} ${probe.name} -> ${result.ok ? 'allowed' : 'denied'} (expected ${shouldPass ? 'allowed' : 'denied'}) ${correct ? '' : `[${verdict}]`}`,
      )
      if (!correct) {
        findings.push({
          role,
          probe: probe.name,
          tier: probe.tier,
          expected: shouldPass ? 'allowed' : 'denied',
          actual: result.ok ? 'allowed' : 'denied',
          error: result.error?.message ?? null,
        })
      }
    }

    console.log('  -- reads (FOR ALL split regression) --')
    for (const table of READ_PROBES) {
      const { error } = await client.from(table).select('id').limit(1)
      const readable = !error
      readGrid[table] ??= {}
      readGrid[table][role] = readable
      if (!readable) {
        console.log(`    ✗ ${table} NOT READABLE — ${error.message}`)
        findings.push({
          role,
          probe: `${table} SELECT`,
          tier: 'read',
          expected: 'allowed',
          actual: 'denied',
          error: error.message,
        })
      }
    }
    const unreadable = READ_PROBES.filter((t) => !readGrid[t][role])
    console.log(`    ${unreadable.length === 0 ? '✓' : '✗'} ${READ_PROBES.length - unreadable.length}/${READ_PROBES.length} tables readable`)
  }

  console.log('\n\n================ SUMMARY ================')
  if (findings.length === 0) {
    console.log('No deviations. Every role writes exactly what its tier allows, and')
    console.log('every probed table is still readable by every role.')
  } else {
    console.log(`${findings.length} deviation(s) from the expected role matrix:\n`)
    for (const f of findings) {
      console.log(`  [${f.role}] ${f.probe}`)
      console.log(`      tier=${f.tier} expected=${f.expected} actual=${f.actual}`)
      if (f.error) console.log(`      db said: ${f.error}`)
    }
  }
  process.exit(findings.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('\nProbe harness failed:', err.message)
  process.exit(2)
})
