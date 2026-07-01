// Live verification for the credential feature:
//   1. Derived-status view returns valid/expiring_soon/expired correctly.
//   2. The (credential, threshold) dedup constraint blocks re-alerts.
//   3. RLS: an anon client sees no credentials; a signed-in org member does.
// Inserts test rows via the service role, then cleans them up.
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
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ACME = '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f'
const PASSWORD = 'HazardOS-QA-2026!'

function isoIn(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const created = []
let failures = 0
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}${extra ? ' — ' + extra : ''}`)
  if (!ok) failures++
}

try {
  // A worker + a credential type in Acme.
  const { data: worker } = await admin
    .from('profiles').select('id').eq('organization_id', ACME).eq('role', 'technician').limit(1).single()
  const { data: type } = await admin
    .from('credential_types').select('id, warning_lead_days').eq('organization_id', ACME).limit(1).single()

  // Insert three credentials at different horizons.
  const cases = [
    { label: 'valid', expiry: isoIn(400) },
    { label: 'expiring_soon', expiry: isoIn(5) },
    { label: 'expired', expiry: isoIn(-3) },
  ]
  for (const c of cases) {
    const { data, error } = await admin.from('credentials').insert({
      organization_id: ACME, credential_type_id: type.id, worker_id: worker.id, expiry_date: c.expiry,
    }).select('id').single()
    if (error) throw error
    c.id = data.id
    created.push(data.id)
  }

  // 1. Derived-status view.
  const { data: statuses } = await admin
    .from('credential_status').select('id,status').in('id', created)
  for (const c of cases) {
    const row = statuses.find((s) => s.id === c.id)
    check(`view status is ${c.label}`, row?.status === c.label, `got ${row?.status}`)
  }

  // 2. Dedup: same (credential, threshold) can't be inserted twice.
  const alertRow = { organization_id: ACME, credential_id: cases[1].id, threshold_days: 7 }
  const first = await admin.from('credential_alerts').insert(alertRow)
  const second = await admin.from('credential_alerts').insert(alertRow)
  check('first alert insert succeeds', !first.error)
  check('duplicate alert insert is rejected (dedup)', second.error?.code === '23505', second.error?.code)
  await admin.from('credential_alerts').delete().eq('credential_id', cases[1].id)

  // 3. RLS: anon vs signed-in member.
  const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: anonRows } = await anon.from('credentials').select('id').in('id', created)
  check('anon client sees no credentials (RLS)', (anonRows?.length ?? 0) === 0, `saw ${anonRows?.length ?? 0}`)

  const member = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { error: signInErr } = await member.auth.signInWithPassword({
    email: 'roy.tolosa+admin@asymmetric.pro', password: PASSWORD,
  })
  if (signInErr) {
    check('sign in Acme member', false, signInErr.message)
  } else {
    const { data: memberRows } = await member.from('credentials').select('id').in('id', created)
    check('signed-in Acme member sees the credentials (RLS)', (memberRows?.length ?? 0) === created.length, `saw ${memberRows?.length ?? 0}/${created.length}`)
  }
} finally {
  // Cleanup.
  if (created.length) await admin.from('credentials').delete().in('id', created)
  console.log(`\nCleaned up ${created.length} test credentials.`)
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}
