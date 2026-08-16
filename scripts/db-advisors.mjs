#!/usr/bin/env node
// Run Supabase's database advisors (splinter) and fail on anything we have not
// already accepted.
//
// Why this exists: the Supabase dashboard Advisor has no way to dismiss or
// acknowledge a finding, and a large share of ours are correct by design and
// will never clear. The customer portal token functions have to stay callable
// by anon, and the RLS helpers (get_user_role, get_user_organization_id) have to
// stay callable by authenticated or row-level security breaks everywhere. A
// permanently red dashboard is a dashboard nobody reads, which is how a real
// finding gets missed.
//
// So the signal moves here. Every accepted finding is listed, with a reason, in
// supabase/lints/advisor-exceptions.json, keyed by the cache_key splinter emits
// for exactly this purpose. Anything not on that list fails the build.
//
// Usage:
//   node scripts/db-advisors.mjs --db-url "postgresql://..."
//   SUPABASE_TEST_DB_URL=... node scripts/db-advisors.mjs
//   node scripts/db-advisors.mjs --fail-on error      (default: warn)
//   node scripts/db-advisors.mjs --json               (machine-readable)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const SPLINTER = join(ROOT, 'supabase', 'lints', 'splinter.sql')
const EXCEPTIONS = join(ROOT, 'supabase', 'lints', 'advisor-exceptions.json')

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}
const has = (name) => argv.includes(`--${name}`)

const dbUrl =
  flag('db-url') ||
  process.env.SUPABASE_TEST_DB_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL
if (!dbUrl) {
  console.error('No database URL. Pass --db-url, or set SUPABASE_TEST_DB_URL / DATABASE_URL.')
  process.exit(2)
}

// warn (default) fails on ERROR and WARN. error fails only on ERROR. none never
// fails, which is useful for just looking at the current state.
const failOn = (flag('fail-on', 'warn') || 'warn').toLowerCase()
const FAIL_LEVELS = { none: [], error: ['ERROR'], warn: ['ERROR', 'WARN'] }[failOn]
if (!FAIL_LEVELS) {
  console.error(`--fail-on must be one of none, error, warn (got "${failOn}")`)
  process.exit(2)
}

const sql = readFileSync(SPLINTER, 'utf8')
const accepted = JSON.parse(readFileSync(EXCEPTIONS, 'utf8'))
const acceptedByKey = new Map(accepted.exceptions.map((e) => [e.cache_key, e]))
// Rules we never gate on, e.g. the performance advisories, which are a real but
// separate workstream from "did we just open a security hole".
const ignoredRules = new Map((accepted.ignored_rules ?? []).map((r) => [r.name, r]))
// Categories the gate applies to. Everything else is reported, never blocking.
const gateCategories = accepted.gate_categories ?? ['SECURITY']
const inGate = (f) => (f.categories ?? []).some((c) => gateCategories.includes(c))

const client = new pg.Client({
  connectionString: dbUrl,
  // Supabase's pooler presents a certificate for a different host than the one
  // dialled, and this is a read-only lint over an already-trusted connection.
  ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
})

let findings = []
try {
  await client.connect()
  // The leading `do $$` block sets a transaction-local config the main query
  // reads, so both have to run in one transaction. A single multi-statement
  // query gives us that implicitly.
  const results = await client.query(sql)
  const arr = Array.isArray(results) ? results : [results]
  const withRows = arr.filter((r) => Array.isArray(r.rows) && r.fields?.some((f) => f.name === 'cache_key'))
  findings = withRows.flatMap((r) => r.rows)
} catch (err) {
  console.error('Failed to run the advisors:', err.message)
  process.exit(2)
} finally {
  await client.end().catch(() => {})
}

const isNew = (f) => inGate(f) && !ignoredRules.has(f.name) && !acceptedByKey.has(f.cache_key)
const fresh = findings.filter(isNew)
const known = findings.filter((f) => !isNew(f))
const outOfGate = findings.filter((f) => !inGate(f) || ignoredRules.has(f.name))

// An exception that no longer matches anything is stale. Not a failure, but it
// should be removed so the list keeps meaning something.
const firing = new Set(findings.map((f) => f.cache_key))
const stale = accepted.exceptions.filter((e) => !firing.has(e.cache_key))

if (has('json')) {
  console.log(JSON.stringify({ new: fresh, accepted: known.length, stale }, null, 2))
} else {
  const byLevel = (list) => ['ERROR', 'WARN', 'INFO'].map((l) => `${l}:${list.filter((f) => f.level === l).length}`).join('  ')
  console.log(`advisors: ${findings.length} finding(s) total  [${byLevel(findings)}]`)
  console.log(`gating on: ${gateCategories.join(', ')}`)
  console.log(`accepted:  ${known.length - outOfGate.length} reviewed and listed`)
  console.log(`not gated: ${outOfGate.length} (other categories and ignored rules, reported only)`)

  // Show what is being carried without blocking, so it cannot quietly grow
  // forever unnoticed.
  const outByRule = {}
  for (const f of outOfGate) outByRule[f.name] = (outByRule[f.name] ?? 0) + 1
  if (Object.keys(outByRule).length) {
    console.log('\n  not gated, by rule:')
    for (const [n, c] of Object.entries(outByRule).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(c).padStart(4)}  ${n}`)
    }
  }

  if (fresh.length) {
    console.log(`\nNEW, not yet accepted: ${fresh.length}  [${byLevel(fresh)}]`)
    for (const f of fresh) {
      console.log(`\n  [${f.level}] ${f.name}`)
      console.log(`  ${String(f.detail).replace(/\s+/g, ' ').slice(0, 220)}`)
      console.log(`  cache_key: ${f.cache_key}`)
      if (f.remediation) console.log(`  ${f.remediation}`)
    }
    console.log(
      '\nEither fix these, or, if the finding is correct by design, add the cache_key\n' +
      'to supabase/lints/advisor-exceptions.json with a reason explaining why.'
    )
  } else {
    console.log('\nNo new findings.')
  }

  if (stale.length) {
    console.log(`\nStale exceptions (no longer firing, safe to delete): ${stale.length}`)
    for (const e of stale) console.log(`  ${e.cache_key}`)
  }
}

const blocking = fresh.filter((f) => FAIL_LEVELS.includes(f.level))
if (blocking.length) {
  console.error(`\nFailing: ${blocking.length} new finding(s) at or above ${failOn}.`)
  process.exit(1)
}
process.exit(0)
