#!/usr/bin/env node
/**
 * Deletes an organisation and everything belonging to it.
 *
 * The database does most of the work: 80 foreign keys cascade from
 * `organizations`, so removing the row takes contacts, jobs, estimates,
 * invoices, surveys and profiles with it. `audit_log.organization_id` is
 * SET NULL, so the audit trail survives on purpose.
 *
 * What the cascade does NOT cover, and this script does:
 *   - auth.users        profiles cascade away, but the logins they belong to do
 *                       not; without this they linger, able to authenticate
 *                       into nothing
 *   - storage objects   photos and documents are keyed by org id in the path
 *
 * Safety, because this is irreversible and points at production by default:
 *   - dry run unless --confirm="<exact org name>" is given
 *   - refuses an 'active' organisation outright; suspend it first, which is
 *     itself reversible and now actually revokes access
 *   - prints what would go before it goes
 *
 * Usage:
 *   node scripts/delete-org.mjs --org-id=<uuid>
 *   node scripts/delete-org.mjs --org-id=<uuid> --confirm="AHS-Test"
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

/**
 * Environment variables win over .env.local, so this can be pointed at a local
 * stack for testing instead of only ever at production:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/delete-org.mjs ...
 */
function readEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  }
  const raw = readFileSync('.env.local', 'utf8')
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

// Reported in the dry run so the scale of the delete is visible. The cascade
// covers every org-scoped table; these are the ones worth eyeballing.
const REPORT_TABLES = [
  'customers', 'companies', 'properties', 'opportunities', 'site_surveys',
  'survey_photos', 'estimates', 'estimate_line_items', 'proposals', 'jobs',
  'job_documents', 'job_completions', 'invoices', 'invoice_line_items',
  'payments', 'work_orders', 'lab_reports', 'activity_log', 'api_keys',
  'pipeline_stages', 'credentials', 'profiles',
]

const BUCKETS = [
  'survey-photos', 'assessment-photos', 'assessment-media', 'job-documents',
  'job-completion-photos', 'organization-documents', 'work-order-documents',
  'lab-reports',
]

const DELETABLE_STATUSES = ['trial', 'suspended', 'cancelled']

const args = process.argv.slice(2)
const orgId = (args.find((a) => a.startsWith('--org-id=')) || '').split('=')[1]
const confirmArg = args.find((a) => a.startsWith('--confirm='))
const confirmName = confirmArg ? confirmArg.slice('--confirm='.length).replace(/^"|"$/g, '') : null

if (!orgId) {
  console.error('usage: node scripts/delete-org.mjs --org-id=<uuid> [--confirm="<org name>"]')
  process.exit(1)
}

const env = readEnv()
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: org, error: orgErr } = await svc
  .from('organizations')
  .select('id, name, status, subscription_tier, created_at')
  .eq('id', orgId)
  .maybeSingle()

if (orgErr) throw new Error(`could not read organisation: ${orgErr.message}`)
if (!org) throw new Error(`no organisation with id ${orgId}`)

console.log(`\nOrganisation : ${org.name}`)
console.log(`Id           : ${org.id}`)
console.log(`Status       : ${org.status} (${org.subscription_tier})`)
console.log(`Created      : ${org.created_at}\n`)

// --- what would go --------------------------------------------------------
let rows = 0
const counts = []
for (const table of REPORT_TABLES) {
  const { count, error } = await svc
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  if (error) continue // table without organization_id, or not present
  if (count) {
    counts.push(`  ${String(count).padStart(6)}  ${table}`)
    rows += count
  }
}

const { data: profiles } = await svc.from('profiles').select('id, email').eq('organization_id', orgId)
const users = profiles ?? []

const storage = []
for (const bucket of BUCKETS) {
  const { data: objects } = await svc.storage.from(bucket).list(orgId, { limit: 1000 })
  if (objects?.length) storage.push({ bucket, count: objects.length })
}

console.log('Rows (reported tables; the cascade covers all 80 org-scoped tables):')
console.log(counts.length ? counts.join('\n') : '  (none)')
console.log(`\nAuth users (${users.length}):`)
console.log(users.length ? users.map((u) => `  ${u.email}`).join('\n') : '  (none)')
console.log(`\nStorage:`)
console.log(
  storage.length ? storage.map((s) => `  ${s.count} object(s) in ${s.bucket}/${orgId}`).join('\n') : '  (none)',
)

// --- gates ----------------------------------------------------------------
if (!DELETABLE_STATUSES.includes(org.status)) {
  console.error(
    `\nREFUSED: status is '${org.status}'. Only ${DELETABLE_STATUSES.join('/')} organisations can be deleted.\n` +
      `Suspend it first — that is reversible and already revokes access:\n` +
      `  update organizations set status = 'suspended' where id = '${orgId}';`,
  )
  process.exit(1)
}

if (confirmName !== org.name) {
  console.log(
    `\nDRY RUN — nothing deleted.\n` +
      `To go ahead, pass the organisation name back exactly:\n` +
      `  node scripts/delete-org.mjs --org-id=${orgId} --confirm="${org.name}"`,
  )
  process.exit(0)
}

// --- delete ---------------------------------------------------------------
console.log('\nDeleting…')

for (const { bucket } of storage) {
  const { data: objects } = await svc.storage.from(bucket).list(orgId, { limit: 1000 })
  const paths = (objects ?? []).map((o) => `${orgId}/${o.name}`)
  if (paths.length) {
    const { error } = await svc.storage.from(bucket).remove(paths)
    console.log(`  storage ${bucket}: ${error ? 'FAILED ' + error.message : paths.length + ' removed'}`)
  }
}

// The org row must go before the auth users, because profiles (which is how we
// found those users) cascades away with it.
const { error: delErr } = await svc.from('organizations').delete().eq('id', orgId)
if (delErr) throw new Error(`deleting organisation failed: ${delErr.message}`)
console.log(`  organisation: deleted (cascaded ${rows} reported rows)`)

for (const u of users) {
  const { error } = await svc.auth.admin.deleteUser(u.id)
  console.log(`  auth user ${u.email}: ${error ? 'FAILED ' + error.message : 'deleted'}`)
}

const { data: check } = await svc.from('organizations').select('id').eq('id', orgId).maybeSingle()
console.log(`\n${check ? 'WARNING: organisation still present' : 'Done. Organisation removed.'}`)
