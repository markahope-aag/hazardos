// One-off recovery for a survey-rooted estimate that got stuck in
// `draft` because the old auto-estimate route had a silent fallback.
// New estimates land in pending_approval directly; this script flips
// the existing stuck row + creates the missing approval_request.
//
// Usage: node scripts/recover-stuck-draft-estimate.mjs EST-41114-522026

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

const estimateNumber = process.argv[2]
if (!estimateNumber) {
  console.error('usage: node scripts/recover-stuck-draft-estimate.mjs <ESTIMATE_NUMBER>')
  process.exit(1)
}

const env = readEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: estimate, error: estErr } = await supabase
  .from('estimates')
  .select('id, organization_id, status, total, site_survey_id, created_by, estimate_number')
  .eq('estimate_number', estimateNumber)
  .single()

if (estErr || !estimate) {
  console.error('Estimate not found:', estErr?.message || 'no row')
  process.exit(1)
}

console.log('Found estimate:', {
  id: estimate.id,
  number: estimate.estimate_number,
  status: estimate.status,
  total: estimate.total,
  hasSurvey: !!estimate.site_survey_id,
})

if (!estimate.site_survey_id) {
  console.error('Refusing to promote: estimate has no site_survey_id (it might be a legitimate standalone draft)')
  process.exit(1)
}

if (estimate.status !== 'draft') {
  console.log(`Estimate is already in '${estimate.status}', nothing to do.`)
  process.exit(0)
}

const { data: existingReq } = await supabase
  .from('approval_requests')
  .select('id, final_status')
  .eq('entity_type', 'estimate')
  .eq('entity_id', estimate.id)
  .maybeSingle()

if (existingReq) {
  console.log('Approval request already exists:', existingReq)
} else {
  const { data: req, error: reqErr } = await supabase
    .from('approval_requests')
    .insert({
      organization_id: estimate.organization_id,
      entity_type: 'estimate',
      entity_id: estimate.id,
      amount: estimate.total || 0,
      requested_by: estimate.created_by,
      requested_at: new Date().toISOString(),
      level1_status: 'pending',
      requires_level2: true,
      level2_status: 'pending',
      final_status: 'pending',
    })
    .select()
    .single()
  if (reqErr) {
    console.error('Failed to create approval_request:', reqErr.message)
    process.exit(1)
  }
  console.log('Created approval_request:', req.id)
}

const { error: updErr } = await supabase
  .from('estimates')
  .update({ status: 'pending_approval' })
  .eq('id', estimate.id)

if (updErr) {
  console.error('Failed to update estimate status:', updErr.message)
  process.exit(1)
}

console.log(`Promoted ${estimate.estimate_number} -> pending_approval`)
