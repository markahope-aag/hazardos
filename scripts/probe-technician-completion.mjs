#!/usr/bin/env node
/**
 * Focused probe: what actually happens when a TECHNICIAN creates a job
 * completion after the 24 July role-scoping sweep.
 *
 * JobCompletionService.createCompletion does three writes:
 *   1. INSERT job_completions        -> TENANT_FIELD, technician allowed
 *   2. UPDATE jobs SET completion_id -> TENANT_WRITE, technician NOT allowed
 *   3. variance recalc + activity log
 *
 * Step 2's result is never checked (job-completion-service.ts:223). An RLS
 * UPDATE denial matches zero rows and returns NO error, so this reproduces
 * the audit's "Pattern A — silent success" shape if the write is refused.
 *
 * Self-cleaning: the completion row is removed and the job restored.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const ACME_ORG_ID = '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f'

async function asRole(email) {
  const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
  const { error } = await c.auth.signInWithPassword({ email, password: 'HazardOS-QA-2026!' })
  if (error) throw new Error(`${email}: ${error.message}`)
  return c
}

async function run(label, email) {
  console.log(`\n=== ${label} (${email}) ===`)
  const client = await asRole(email)

  // Pick a job with no completion yet.
  const { data: job } = await admin
    .from('jobs')
    .select('id, job_number, completion_id')
    .eq('organization_id', ACME_ORG_ID)
    .is('completion_id', null)
    .limit(1)
    .single()

  if (!job) {
    console.log('  no completion-free job available to probe')
    return
  }
  console.log(`  job ${job.job_number} (completion_id starts as ${job.completion_id})`)

  // Step 1 — can they read the job at all? (the "should see jobs" question)
  const { data: readBack, error: readErr } = await client
    .from('jobs')
    .select('id, job_number, status')
    .eq('id', job.id)
    .single()
  console.log(`  1. READ jobs        -> ${readErr ? `DENIED (${readErr.message})` : `ok, sees ${readBack.job_number}`}`)

  // Step 2 — INSERT job_completions (TENANT_FIELD).
  const { data: completion, error: insErr } = await client
    .from('job_completions')
    .insert({ job_id: job.id, status: 'draft' })
    .select('id')
    .single()
  console.log(`  2. INSERT completion-> ${insErr ? `DENIED (${insErr.message})` : `ok, id ${completion.id}`}`)
  if (insErr) return

  // Step 3 — the unchecked UPDATE at job-completion-service.ts:223.
  const { data: updRows, error: updErr } = await client
    .from('jobs')
    .update({ completion_id: completion.id })
    .eq('id', job.id)
    .select('id')

  const rows = updRows?.length ?? 0
  console.log(
    `  3. UPDATE jobs.completion_id -> error=${updErr ? updErr.message : 'none'}, rows affected=${rows}`,
  )

  // Ground truth: did the link actually land?
  const { data: after } = await admin
    .from('jobs')
    .select('completion_id')
    .eq('id', job.id)
    .single()
  const linked = after.completion_id === completion.id
  console.log(`  4. VERIFY via service role -> jobs.completion_id ${linked ? 'SET (linked)' : 'STILL NULL (orphaned completion)'}`)

  if (!linked && !updErr) {
    console.log('\n  >> SILENT FAILURE: the write was refused, no error was raised,')
    console.log('     and the calling code does not check rows affected.')
  }

  // Clean up.
  await admin.from('jobs').update({ completion_id: null }).eq('id', job.id)
  await admin.from('job_completions').delete().eq('id', completion.id)
  console.log('  (cleaned up)')
}

await run('technician', 'roy.tolosa+technician@asymmetric.pro')
await run('estimator (control)', 'roy.tolosa+estimator@asymmetric.pro')
