#!/usr/bin/env node
// Fail the build when a mutating API route ships without a declarative role
// guard.
//
// Why this exists: the 2026-08-16 audit found 43% of mutating route files had
// no `allowedRoles`. Probing showed they were mostly still protected, but by
// three different mechanisms (an internal check, RLS, or nothing), and only one
// of those is visible when you read the route. That blind spot produced two
// real vulnerabilities in one week:
//
//   change orders  a technician created and approved one, and the rollup then
//                  failed silently because RLS refused that second write
//   time clock     a technician approved their own timesheet, because the
//                  policy left the role rule to an API the browser can skip
//
// Neither was findable by reading. Both were findable by probing. A declarative
// guard costs one line and turns "is this safe?" into something you can see.
//
// Not everything should be guarded, so three things are exempt:
//   - createPublicApiHandler   deliberately public (customer portal signing)
//   - withApiKeyAuth           the /v1 API, which authenticates by scoped key
//   - an explicit opt-out      // route-guard: <reason>
//
// Usage:
//   node scripts/check-route-guards.mjs            fail on anything unlisted
//   node scripts/check-route-guards.mjs --baseline rewrite the allowlist
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API_DIR = join(ROOT, 'app', 'api')
const BASELINE = join(ROOT, 'scripts', 'route-guard-baseline.json')

const MUTATING = /export\s+const\s+(POST|PATCH|PUT|DELETE)\b/
const GUARDED = /allowedRoles/
const PUBLIC_HANDLER = /createPublicApiHandler/
const API_KEY_AUTH = /withApiKeyAuth/
const OPT_OUT = /\/\/\s*route-guard:/

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry === 'route.ts') out.push(full)
  }
  return out
}

const offenders = []
for (const file of walk(API_DIR)) {
  const src = readFileSync(file, 'utf8')
  if (!MUTATING.test(src)) continue
  if (GUARDED.test(src) || PUBLIC_HANDLER.test(src) || API_KEY_AUTH.test(src) || OPT_OUT.test(src)) continue
  offenders.push(relative(ROOT, file).split('\\').join('/'))
}
offenders.sort()

if (process.argv.includes('--baseline')) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comment: [
          'Mutating API routes that predate the declarative-guard rule.',
          'Anything NOT listed here must declare allowedRoles, use',
          'createPublicApiHandler or withApiKeyAuth, or carry an explicit',
          '// route-guard: <reason> opt-out.',
          'This list should only ever shrink. Do not add to it.',
        ],
        routes: offenders,
      },
      null,
      2
    ) + '\n'
  )
  console.log(`baseline written: ${offenders.length} route(s)`)
  process.exit(0)
}

let baseline = { routes: [] }
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
} catch {
  console.error('No baseline found. Run with --baseline once to create it.')
  process.exit(2)
}

const known = new Set(baseline.routes)
const fresh = offenders.filter((r) => !known.has(r))
// A route that got a guard since the baseline was written should leave the
// list, otherwise the allowlist slowly stops meaning anything.
const fixed = baseline.routes.filter((r) => !offenders.includes(r))

console.log(`mutating routes without a declarative guard: ${offenders.length}`)
console.log(`  allowed by baseline: ${offenders.length - fresh.length}`)

if (fixed.length) {
  console.log(`\n${fixed.length} route(s) now guarded and can leave the baseline:`)
  for (const r of fixed) console.log(`  ${r}`)
  console.log('  Re-run with --baseline to update.')
}

if (fresh.length) {
  console.error(`\n${fresh.length} NEW route(s) with no role guard:`)
  for (const r of fresh) console.error(`  ${r}`)
  console.error(
    '\nAdd `allowedRoles: ROLES.<PRESET>` to the handler options, or if the route\n' +
      'is deliberately open, mark it with `// route-guard: <reason>` so the absence\n' +
      'reads as a decision rather than an oversight.'
  )
  process.exit(1)
}

console.log('\nNo new unguarded routes.')
process.exit(0)
