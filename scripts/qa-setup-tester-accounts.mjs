// QA account setup for both testers in the "Acme Remediation" test org.
// Idempotent — safe to re-run.
//
//  - Ensures a clean, known-password role set for Roy and Sophie.
//  - Normalizes Sophie's naming (+tech -> +technician) and removes the
//    orphaned +designator account.
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
const supabase = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ACME_ORG_ID = '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f'
const PASSWORD = 'HazardOS-QA-2026!'

// Desired end-state accounts (upserted with a known password).
const accounts = [
  { email: 'roy.tolosa+owner@asymmetric.pro', role: 'tenant_owner', first: 'Roy', last: 'Tolosa' },
  { email: 'roy.tolosa+admin@asymmetric.pro', role: 'admin', first: 'Roy', last: 'Tolosa' },
  { email: 'roy.tolosa+estimator@asymmetric.pro', role: 'estimator', first: 'Roy', last: 'Tolosa' },
  { email: 'roy.tolosa+technician@asymmetric.pro', role: 'technician', first: 'Roy', last: 'Tolosa' },
  { email: 'roy.tolosa+viewer@asymmetric.pro', role: 'viewer', first: 'Roy', last: 'Tolosa' },
  { email: 'sophie.hope+owner@asymmetric.pro', role: 'tenant_owner', first: 'Sophie', last: 'Hope' },
  { email: 'sophie.hope+admin@asymmetric.pro', role: 'admin', first: 'Sophie', last: 'Hope' },
  { email: 'sophie.hope+estimator@asymmetric.pro', role: 'estimator', first: 'Sophie', last: 'Hope' },
  { email: 'sophie.hope+technician@asymmetric.pro', role: 'technician', first: 'Sophie', last: 'Hope' },
  { email: 'sophie.hope+viewer@asymmetric.pro', role: 'viewer', first: 'Sophie', last: 'Hope' },
]

// Superseded by +technician — keep the login but deactivate it.
const deactivate = ['sophie.hope+tech@asymmetric.pro']

// Orphaned (organization_id = null) leftover — remove entirely.
const remove = ['sophie.hope+designator@asymmetric.pro']

// listUsers has no getByEmail; page once and build a lookup map.
const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
if (listErr) { console.error('auth list error:', listErr); process.exit(1) }
const byEmail = new Map(userList.users.map((u) => [u.email?.toLowerCase(), u]))
const find = (email) => byEmail.get(email.toLowerCase()) || null

for (const acc of accounts) {
  console.log(`\n--- ${acc.email} (${acc.role}) ---`)
  let user = find(acc.email)

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: acc.first, last_name: acc.last },
    })
    if (error) { console.error('  createUser failed:', error.message); continue }
    user = data.user
    console.log(`  auth user created: ${user.id}`)
  } else {
    await supabase.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true })
    console.log(`  auth user existed: ${user.id} (password reset)`)
  }

  // full_name is a generated column — never set it directly.
  const { error: upErr } = await supabase
    .from('profiles')
    .update({
      organization_id: ACME_ORG_ID,
      role: acc.role,
      first_name: acc.first,
      last_name: acc.last,
      is_active: true,
    })
    .eq('id', user.id)
  if (upErr) { console.error('  profile update failed:', upErr.message); continue }
  console.log(`  profile set -> org=Acme role=${acc.role}`)
}

for (const email of deactivate) {
  const user = find(email)
  if (!user) { console.log(`\n[deactivate] ${email}: not found (skip)`); continue }
  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', user.id)
  console.log(`\n[deactivate] ${email}: ${error ? 'FAILED ' + error.message : 'is_active=false'}`)
}

for (const email of remove) {
  const user = find(email)
  if (!user) { console.log(`\n[remove] ${email}: not found (skip)`); continue }
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  console.log(`\n[remove] ${email}: ${error ? 'FAILED ' + error.message : 'deleted (profile cascades)'}`)
}

// Final state for both testers.
const { data: check } = await supabase
  .from('profiles')
  .select('email, role, organization_id, is_active')
  .or('email.ilike.%roy.tolosa%,email.ilike.%sophie.hope%')
  .order('email')
console.log('\n=== Roy / Sophie profiles ===')
console.log(JSON.stringify(check, null, 2))
console.log(`\nShared QA password: ${PASSWORD}`)
