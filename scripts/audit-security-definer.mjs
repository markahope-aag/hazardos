// Triage SECURITY DEFINER functions in the public schema:
// classify each as "trigger-only" (safe to revoke EXECUTE from anon/authenticated)
// vs "callable" (used in RLS or app code — leave grants alone).
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const sql = `
SELECT json_agg(row_to_json(t)) AS rows
FROM (
  SELECT
    p.proname AS func_name,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_trigger trg
        WHERE trg.tgfoid = p.oid AND NOT trg.tgisinternal
      ) THEN 'trigger'
      ELSE 'callable'
    END AS kind,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
    array_to_string(p.proconfig, ', ') AS config,
    pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
  ORDER BY kind, p.proname
) t;
`

const { default: pg } = await import('pg')
// Build pooler URL — direct DB host times out on this Windows box (IPv6 only).
const rawPass = env.DATABASE_URL?.match(/postgres:([^@]*)@/)?.[1] ?? ''
const encPass = encodeURIComponent(rawPass)
const dbUrl = `postgresql://postgres.inzwwbbbdookxkkotbxj:${encPass}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`
if (!dbUrl) {
  console.error('No SUPABASE_DB_URL / DATABASE_URL in .env.local')
  process.exit(1)
}
const client = new pg.Client({ connectionString: dbUrl })
await client.connect()
const innerSql = sql.replace(/SELECT json_agg.*?FROM \(/s, '').replace(/\) t;\s*$/, '')
const res = await client.query(innerSql)
await client.end()
printRows(res.rows)

function printRows(rows) {
  if (!rows || rows.length === 0) {
    console.log('No SECURITY DEFINER functions found.')
    return
  }
  console.log(`Found ${rows.length} SECURITY DEFINER functions in public schema.\n`)

  const triggers = rows.filter((r) => r.kind === 'trigger')
  const callable = rows.filter((r) => r.kind === 'callable')

  console.log(`=== Trigger functions (${triggers.length}) — candidates for REVOKE EXECUTE ===`)
  for (const r of triggers) {
    const flags = [r.anon_exec ? 'anon' : null, r.auth_exec ? 'auth' : null].filter(Boolean).join('/') || 'none'
    console.log(`  ${r.func_name}(${r.args})  exec=${flags}  config=${r.config || '(none)'}`)
  }

  console.log(`\n=== Callable functions (${callable.length}) — DO NOT revoke without checking call sites ===`)
  for (const r of callable) {
    const flags = [r.anon_exec ? 'anon' : null, r.auth_exec ? 'auth' : null].filter(Boolean).join('/') || 'none'
    console.log(`  ${r.func_name}(${r.args})  exec=${flags}  config=${r.config || '(none)'}`)
  }
}
