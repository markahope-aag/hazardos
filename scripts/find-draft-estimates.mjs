// Quick lookup: find any draft estimates that have a site_survey_id —
// those are the bug-state rows the old auto-estimate route left behind.
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

const { data, error } = await supabase
  .from('estimates')
  .select('id, estimate_number, status, site_survey_id, total, created_at, organization_id')
  .eq('status', 'draft')
  .order('created_at', { ascending: false })

if (error) {
  console.error(error)
  process.exit(1)
}

console.log(`Found ${data.length} draft estimates:`)
for (const e of data) {
  console.log(
    `  ${e.estimate_number}  total=${e.total}  survey=${e.site_survey_id ? 'YES' : 'no'}  created=${e.created_at}  org=${e.organization_id.slice(0, 8)}`,
  )
}

const surveyRooted = data.filter((e) => e.site_survey_id)
console.log(`\n${surveyRooted.length} of those are survey-rooted (need promotion to pending_approval).`)
