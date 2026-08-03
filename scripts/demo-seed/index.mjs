#!/usr/bin/env node
/**
 * Builds the client demo tenant.
 *
 * Creates (or rebuilds) a self-contained organisation with a realistic team,
 * CRM, and a complete survey -> estimate -> proposal -> job -> invoice story,
 * including field photos pushed through the real R2 pipeline.
 *
 * Deliberately separate from "Acme Remediation", which is the QA test org
 * (scripts/qa-setup-tester-accounts.mjs points 10 role-permutation logins at
 * it). Nothing here touches Acme.
 *
 * Idempotent: re-running wipes the target org's business data and rebuilds it.
 * The organisation row and the team logins are reused so sign-in details stay
 * stable.
 *
 * Usage: node scripts/demo-seed/index.mjs [--profile=<key>]
 *
 *   summit  the client demo tenant (default)
 *   ahs     disposable evaluation sandbox; logins are aliases we control
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { randomUUID, createHash } from 'node:crypto'

import {
  TEAM as BASE_TEAM,
  COMPANIES,
  CONTACTS,
  PROPERTIES,
  LABS,
  LAB_REPORTS,
  OPPORTUNITIES,
  SURVEYS,
  ESTIMATES,
  PROPOSALS,
  JOBS,
  INVOICES,
  PHOTO_PLAN,
} from './data.mjs'
import { resolveProfile, PROTECTED_ORG_IDS } from './profiles.mjs'

// ---------------------------------------------------------------------------
// Tenant selection
// ---------------------------------------------------------------------------

const PROFILE = resolveProfile(process.argv.slice(2))
const ORG = PROFILE.org
const PASSWORD = PROFILE.password
const TEAM = BASE_TEAM.map((m) => ({ ...m, email: PROFILE.teamEmail(m) }))

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

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
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const R2_BUCKET = env.R2_BUCKET ?? 'hazardos-images'
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODAY = new Date()

const dayShift = (days) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return d
}
const isoDate = (days) => dayShift(days).toISOString().slice(0, 10)
const isoStamp = (days) => dayShift(days).toISOString()

const money = (n) => Math.round(n * 100) / 100

function must(label, { data, error }) {
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

async function insert(table, rows, label = table) {
  const list = Array.isArray(rows) ? rows : [rows]
  if (list.length === 0) return []
  const data = must(`insert ${label}`, await db.from(table).insert(list).select())
  return data
}

const step = (msg) => console.log(`\n▸ ${msg}`)
const done = (msg) => console.log(`  ✓ ${msg}`)

// ---------------------------------------------------------------------------
// 1. Organisation
// ---------------------------------------------------------------------------

async function ensureOrg() {
  step('Organisation')
  const { data: existing } = await db
    .from('organizations')
    .select('id')
    .eq('name', ORG.name)
    .maybeSingle()

  if (existing) {
    must('update org', await db.from('organizations').update(ORG).eq('id', existing.id))
    done(`reusing ${ORG.name} (${existing.id})`)
    return existing.id
  }

  const [org] = await insert('organizations', ORG)
  done(`created ${ORG.name} (${org.id}) — pipeline stages seeded by trigger`)
  return org.id
}

// ---------------------------------------------------------------------------
// 2. Team
// ---------------------------------------------------------------------------

async function ensureTeam(orgId) {
  step('Team')
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 })
  const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]))
  const ids = {}

  for (const member of TEAM) {
    const existing = byEmail.get(member.email.toLowerCase())
    let userId

    if (existing) {
      await db.auth.admin.updateUserById(existing.id, {
        password: PASSWORD,
        email_confirm: true,
      })
      userId = existing.id
    } else {
      const { data, error } = await db.auth.admin.createUser({
        email: member.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: member.first, last_name: member.last },
      })
      if (error) throw new Error(`create ${member.email}: ${error.message}`)
      userId = data.user.id
    }

    // full_name is a generated column — never write it directly.
    must(
      `profile ${member.email}`,
      await db
        .from('profiles')
        .update({
          organization_id: orgId,
          role: member.role,
          first_name: member.first,
          last_name: member.last,
          phone: member.phone,
          is_active: true,
        })
        .eq('id', userId),
    )

    ids[member.key] = userId
    done(`${member.first} ${member.last} — ${member.role}`)
  }
  return ids
}

// ---------------------------------------------------------------------------
// 3. Teardown of previous business data
// ---------------------------------------------------------------------------

// A wipe deletes an organisation's whole business dataset and its R2 objects.
// ensureOrg() resolves its target by name, so a duplicated or mistyped profile
// name is all that stands between "rebuild the sandbox" and "empty the client
// demo". Confirm the id we are about to clear really belongs to this profile.
async function assertSafeToWipe(orgId) {
  if (PROTECTED_ORG_IDS.has(orgId)) {
    throw new Error(`refusing to wipe protected organisation ${orgId}`)
  }

  const { data: row, error } = await db
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle()

  if (error) throw new Error(`wipe guard lookup failed: ${error.message}`)
  if (!row) throw new Error(`wipe guard: organisation ${orgId} not found`)
  if (row.name !== ORG.name) {
    throw new Error(
      `refusing to wipe "${row.name}" (${orgId}) — ` +
        `profile "${PROFILE.key}" targets "${ORG.name}"`,
    )
  }
}

async function wipe(orgId) {
  await assertSafeToWipe(orgId)
  step('Clearing previous demo data')

  const surveyIds = (
    must('read surveys', await db.from('site_surveys').select('id').eq('organization_id', orgId)) ??
    []
  ).map((r) => r.id)

  // Remove R2 objects for any photos we are about to drop.
  if (surveyIds.length) {
    const photos =
      must(
        'read photos',
        await db
          .from('survey_photos')
          .select('id, original_r2_key, stamped_r2_key')
          .eq('organization_id', orgId),
      ) ?? []
    for (const p of photos) {
      for (const key of [p.original_r2_key, p.stamped_r2_key].filter(Boolean)) {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch(() => {})
      }
    }
    await db.from('survey_photos').delete().eq('organization_id', orgId)
  }

  const jobIds = (
    must('read jobs', await db.from('jobs').select('id').eq('organization_id', orgId)) ?? []
  ).map((r) => r.id)
  const estimateIds = (
    must('read estimates', await db.from('estimates').select('id').eq('organization_id', orgId)) ??
    []
  ).map((r) => r.id)

  // Children first — the guard triggers on customers/site_surveys refuse a
  // delete while dependents remain, which is the P1-5/P1-6 protection working.
  await db.from('invoices').delete().eq('organization_id', orgId)
  if (jobIds.length) {
    await db.from('job_completions').delete().in('job_id', jobIds)
    await db.from('job_notes').delete().in('job_id', jobIds)
  }
  await db.from('jobs').delete().eq('organization_id', orgId)
  await db.from('proposals').delete().eq('organization_id', orgId)
  if (estimateIds.length) {
    await db.from('estimate_line_items').delete().in('estimate_id', estimateIds)
  }
  await db.from('estimates').delete().eq('organization_id', orgId)
  await db.from('opportunities').delete().eq('organization_id', orgId)
  await db.from('site_surveys').delete().eq('organization_id', orgId)
  await db.from('lab_reports').delete().eq('organization_id', orgId)
  await db.from('labs').delete().eq('organization_id', orgId)
  await db.from('property_contacts').delete().eq('organization_id', orgId)
  await db.from('properties').delete().eq('organization_id', orgId)
  await db.from('customers').delete().eq('organization_id', orgId)
  await db.from('companies').delete().eq('organization_id', orgId)
  await db.from('activity_log').delete().eq('organization_id', orgId)

  done('previous demo rows removed')
}

// ---------------------------------------------------------------------------
// 4. CRM
// ---------------------------------------------------------------------------

async function seedCompanies(orgId, users) {
  step('Companies')
  const ids = {}
  for (const c of COMPANIES) {
    const { key, ownerKey, ...fields } = c
    const [row] = await insert('companies', {
      ...fields,
      organization_id: orgId,
      status: 'active',
      account_owner_id: users[ownerKey],
      created_by: users[ownerKey],
    })
    ids[key] = row.id
    done(c.name)
  }
  return ids
}

async function seedContacts(orgId, users, companyIds) {
  step('Contacts')
  const ids = {}
  for (const c of CONTACTS) {
    const { key, companyKey, ownerKey, status, ...fields } = c
    const [row] = await insert('customers', {
      ...fields,
      organization_id: orgId,
      // `name` is the display field and is not computed by the database —
      // it must be composed from first + last on every write.
      name: `${c.first_name} ${c.last_name}`,
      company_id: companyKey ? companyIds[companyKey] : null,
      company_name: companyKey ? COMPANIES.find((x) => x.key === companyKey).name : null,
      status,
      contact_status: 'active',
      account_owner_id: users[ownerKey],
      created_by: users[ownerKey],
      opted_into_email: true,
      preferred_contact_method: 'email',
    })
    ids[key] = row.id
    done(`${c.first_name} ${c.last_name}${companyKey ? ` — ${COMPANIES.find((x) => x.key === companyKey).name}` : ''}`)
  }

  // Point each company at its primary contact.
  for (const c of CONTACTS.filter((x) => x.is_primary_contact && x.companyKey)) {
    await db
      .from('companies')
      .update({ primary_contact_id: ids[c.key] })
      .eq('id', companyIds[c.companyKey])
  }
  return ids
}

async function seedProperties(orgId, users, contactIds) {
  step('Properties')
  const ids = {}

  for (const p of PROPERTIES) {
    const { key, contacts, ...fields } = p
    const [row] = await insert('properties', {
      ...fields,
      organization_id: orgId,
      // normalized_address is a generated column — the database composes it
      // for dedupe/matching. Writing it is rejected.
      created_by: users.dana,
    })
    ids[key] = row.id

    await insert(
      'property_contacts',
      contacts.map((c) => ({
        organization_id: orgId,
        property_id: row.id,
        contact_id: contactIds[c.contactKey],
        role: c.role,
        is_current: c.is_current ?? true,
        created_by: users.dana,
      })),
      'property_contacts',
    )

    const current = contacts.filter((c) => c.is_current ?? true).length
    const past = contacts.length - current
    done(
      `${p.address_line1}, ${p.city} — ${current} contact${current === 1 ? '' : 's'}${past ? ` (+${past} past)` : ''}`,
    )
  }

  // Point residential contacts at the property they own, so the contact
  // detail page shows the address rather than a blank.
  for (const p of PROPERTIES) {
    const owner = p.contacts.find((c) => c.role === 'owner' && (c.is_current ?? true))
    if (!owner) continue
    await db
      .from('customers')
      .update({ property_id: ids[p.key] })
      .eq('id', contactIds[owner.contactKey])
  }

  return ids
}

async function seedLabs(orgId) {
  step('Labs')
  const ids = {}
  for (const l of LABS) {
    const { key, ...fields } = l
    const [row] = await insert('labs', { ...fields, organization_id: orgId, is_active: true })
    ids[key] = row.id
    done(l.name)
  }
  return ids
}

async function seedLabReports(orgId, users, labIds, contactIds, propertyIds) {
  step('Lab reports')
  let seq = 4210
  for (const r of LAB_REPORTS) {
    const { key, labKey, propertyKey, contactKey, orderedOffset, receivedOffset, ...fields } = r
    const property = PROPERTIES.find((p) => p.key === propertyKey)
    const [row] = await insert('lab_reports', {
      ...fields,
      organization_id: orgId,
      lab_id: labIds[labKey],
      customer_id: contactIds[contactKey],
      report_number: `LAB-2026-${seq++}`,
      ordered_date: isoDate(orderedOffset),
      received_date: receivedOffset != null ? isoDate(receivedOffset) : null,
      site_address: property.address_line1,
      site_city: property.city,
      site_state: property.state,
      site_zip: property.zip,
      created_by: users.priya,
      created_at: isoStamp(orderedOffset),
    })
    done(`${row.report_number} — ${r.sample_type} — ${r.status}`)
  }
}

async function seedOpportunities(orgId, users, companyIds, contactIds, propertyIds) {
  step('Opportunities')
  const stages = must(
    'read stages',
    await db.from('pipeline_stages').select('id, name').eq('organization_id', orgId),
  )
  const stageByName = new Map(stages.map((s) => [s.name, s.id]))
  const ids = {}

  for (const o of OPPORTUNITIES) {
    const { key, contactKey, companyKey, propertyKey, stage, ownerKey, closeOffset, ...fields } = o
    const stageId = stageByName.get(stage)
    if (!stageId) throw new Error(`pipeline stage "${stage}" not found`)

    const isClosed = ['won', 'lost'].includes(o.opportunity_status)
    const [row] = await insert('opportunities', {
      ...fields,
      organization_id: orgId,
      customer_id: contactIds[contactKey],
      company_id: companyKey ? companyIds[companyKey] : null,
      property_id: propertyKey ? propertyIds[propertyKey] : null,
      primary_contact_id: contactIds[contactKey],
      stage_id: stageId,
      owner_id: users[ownerKey],
      expected_close_date: isoDate(closeOffset),
      actual_close_date: isClosed ? isoDate(closeOffset) : null,
      weighted_value: money((o.estimated_value * o.probability_pct) / 100),
    })
    ids[key] = row.id
    done(`${o.name} — ${stage}`)
  }
  return ids
}

// ---------------------------------------------------------------------------
// 5. Surveys, estimates, proposals
// ---------------------------------------------------------------------------

async function seedSurveys(orgId, users, contactIds, propertyIds) {
  step('Site surveys')
  const ids = {}
  for (const s of SURVEYS) {
    const { key, oppKey, contactKey, propertyKey, estimatorKey, scheduledOffset, photos, ...fields } = s
    const contact = CONTACTS.find((c) => c.key === contactKey)
    const isDone = ['completed', 'estimated', 'quoted', 'submitted'].includes(s.status)

    const [row] = await insert('site_surveys', {
      ...fields,
      organization_id: orgId,
      customer_id: contactIds[contactKey],
      property_id: propertyKey ? propertyIds[propertyKey] : null,
      customer_name: `${contact.first_name} ${contact.last_name}`,
      customer_email: contact.email,
      customer_phone: contact.mobile_phone,
      site_address: s.site_address ?? contact.address_line1,
      site_city: s.site_city ?? contact.city,
      site_state: s.site_state ?? contact.state,
      site_zip: s.site_zip ?? contact.zip,
      estimator_id: users[estimatorKey],
      assigned_to: users[estimatorKey],
      scheduled_date: isoDate(scheduledOffset),
      scheduled_time_start: '08:00:00',
      scheduled_time_end: '10:00:00',
      appointment_status: isDone ? 'completed' : 'scheduled',
      started_at: isDone ? isoStamp(scheduledOffset) : null,
      submitted_at: isDone ? isoStamp(scheduledOffset) : null,
    })
    ids[key] = row.id
    done(`${s.job_name} — ${s.status}${photos ? ` (${photos} photos)` : ''}`)
  }
  return ids
}

async function seedEstimates(orgId, users, contactIds, surveyIds) {
  step('Estimates')
  const ids = {}
  for (const e of ESTIMATES) {
    const { key, surveyKey, contactKey, createdByKey, createdOffset, validDays, lineItems, ...fields } = e

    const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
    const markupAmount = (subtotal * (e.markup_percent ?? 0)) / 100
    const total = subtotal + markupAmount

    const [row] = await insert('estimates', {
      ...fields,
      organization_id: orgId,
      site_survey_id: surveyIds[surveyKey],
      customer_id: contactIds[contactKey],
      estimate_number: `EST-2026-${String(Object.keys(ids).length + 1041).padStart(4, '0')}`,
      subtotal: money(subtotal),
      markup_amount: money(markupAmount),
      discount_percent: 0,
      discount_amount: 0,
      tax_amount: 0,
      total: money(total),
      valid_until: isoDate(createdOffset + validDays),
      estimated_start_date: isoDate(createdOffset + 21),
      created_by: users[createdByKey],
      created_at: isoStamp(createdOffset),
    })

    await insert(
      'estimate_line_items',
      lineItems.map((li, i) => ({
        ...li,
        estimate_id: row.id,
        total_price: money(li.quantity * li.unit_price),
        sort_order: i,
        is_included: true,
        is_optional: false,
      })),
      'estimate_line_items',
    )

    ids[key] = row.id
    done(`${row.estimate_number} — ${e.project_name} — $${money(total).toLocaleString()} (${lineItems.length} line items)`)
  }
  return ids
}

async function seedProposals(orgId, users, contactIds, estimateIds) {
  step('Proposals')
  const ids = {}
  for (const p of PROPOSALS) {
    const {
      key,
      estimateKey,
      contactKey,
      createdByKey,
      createdOffset,
      sentOffset,
      viewedOffset,
      signedOffset,
      signer_name,
      signer_email,
      ...fields
    } = p

    const signed = p.status === 'signed'
    const [row] = await insert('proposals', {
      ...fields,
      organization_id: orgId,
      estimate_id: estimateIds[estimateKey],
      customer_id: contactIds[contactKey],
      proposal_number: `PRO-2026-${String(Object.keys(ids).length + 2017).padStart(4, '0')}`,
      access_token: randomUUID().replace(/-/g, ''),
      access_token_expires_at: isoStamp(30),
      valid_until: isoDate(createdOffset + 30),
      sent_at: sentOffset != null ? isoStamp(sentOffset) : null,
      sent_to_email: sentOffset != null ? CONTACTS.find((c) => c.key === contactKey).email : null,
      viewed_at: viewedOffset != null ? isoStamp(viewedOffset) : null,
      signed_at: signed ? isoStamp(signedOffset) : null,
      signer_name: signed ? signer_name : null,
      signer_email: signed ? signer_email : null,
      signer_ip: signed ? '198.51.100.24' : null,
      // A real signature pad emits an SVG path; this is a representative one
      // so the signed proposal renders with a signature block rather than a gap.
      signature_data: signed
        ? 'data:image/svg+xml;base64,' +
          Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90"><path d="M12 62 C42 18, 66 74, 92 44 S140 12, 168 52 S214 78, 244 34 S292 22, 308 48" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg>`,
          ).toString('base64')
        : null,
      approval_method: signed ? 'electronic_signature' : null,
      payment_terms: '30% mobilisation deposit, balance net 30 on completion.',
      created_by: users[createdByKey],
      created_at: isoStamp(createdOffset),
    })
    ids[key] = row.id
    done(`${row.proposal_number} — ${p.status}${signed ? ` (signed by ${signer_name})` : ''}`)
  }
  return ids
}

// ---------------------------------------------------------------------------
// 6. Jobs and invoices
// ---------------------------------------------------------------------------

async function seedJobs(orgId, users, contactIds, companyIds, propertyIds, opportunityIds, estimateIds, proposalIds, surveyIds) {
  step('Jobs')
  const ids = {}
  let seq = 1180

  for (const j of JOBS) {
    const {
      key,
      proposalKey,
      estimateKey,
      surveyKey,
      oppKey,
      contactKey,
      companyKey,
      propertyKey,
      crewLeadKey,
      startOffset,
      durationDays,
      address,
      signoff_name,
      depositOffset,
      finalInvoiceOffset,
      finalPaymentOffset,
      ...fields
    } = j

    const isComplete = j.status === 'completed'
    const started = j.status !== 'scheduled'
    const grossMargin =
      j.actual_revenue && j.actual_cost
        ? money(((j.actual_revenue - j.actual_cost) / j.actual_revenue) * 100)
        : null

    const [row] = await insert('jobs', {
      ...fields,
      organization_id: orgId,
      customer_id: contactIds[contactKey],
      company_id: companyKey ? companyIds[companyKey] : null,
      property_id: propertyKey ? propertyIds[propertyKey] : null,
      primary_contact_id: contactIds[contactKey],
      opportunity_id: oppKey ? opportunityIds[oppKey] : null,
      estimate_id: estimateKey ? estimateIds[estimateKey] : null,
      proposal_id: proposalKey ? proposalIds[proposalKey] : null,
      site_survey_id: surveyKey ? surveyIds[surveyKey] : null,
      job_number: `JOB-2026-${seq++}`,
      crew_lead_id: users[crewLeadKey],
      assigned_to: users[crewLeadKey],
      job_address: address.line1,
      job_city: address.city,
      job_state: address.state,
      job_zip: address.zip,
      scheduled_start_date: isoDate(startOffset),
      scheduled_end_date: isoDate(startOffset + durationDays),
      scheduled_start_time: '07:00:00',
      scheduled_end_time: '15:30:00',
      actual_start_at: started ? isoStamp(startOffset) : null,
      actual_end_at: isComplete ? isoStamp(startOffset + durationDays) : null,
      actual_start_date: started ? isoDate(startOffset) : null,
      actual_end_date: isComplete ? isoDate(startOffset + durationDays) : null,
      actual_duration_days: isComplete ? durationDays : null,
      gross_margin_pct: grossMargin,
      customer_signoff_name: j.customer_signed_off ? signoff_name : null,
      customer_signoff_at: j.customer_signed_off ? isoStamp(startOffset + durationDays) : null,
      inspection_date: j.inspection_passed ? isoDate(startOffset + durationDays) : null,
      deposit_received_date: depositOffset != null ? isoDate(depositOffset) : null,
      final_invoice_date: finalInvoiceOffset != null ? isoDate(finalInvoiceOffset) : null,
      final_payment_date: finalPaymentOffset != null ? isoDate(finalPaymentOffset) : null,
      created_by: users.dana,
      created_at: isoStamp(startOffset - 3),
    })
    ids[key] = row.id
    done(`${row.job_number} — ${j.name} — ${j.status}${grossMargin ? ` (${grossMargin}% margin)` : ''}`)
  }
  return ids
}

async function seedInvoices(orgId, users, contactIds, jobIds) {
  step('Invoices')
  let seq = 3120
  for (const inv of INVOICES) {
    const { key, jobKey, contactKey, issuedOffset, dueDays, subtotal, amount_paid, ...fields } = inv
    const total = money(subtotal)
    const balance = money(total - amount_paid)

    const [row] = await insert('invoices', {
      ...fields,
      organization_id: orgId,
      job_id: jobIds[jobKey],
      customer_id: contactIds[contactKey],
      invoice_number: `INV-2026-${seq++}`,
      invoice_date: isoDate(issuedOffset),
      due_date: isoDate(issuedOffset + dueDays),
      subtotal: total,
      tax_rate: 0,
      tax_amount: 0,
      discount_amount: 0,
      total,
      amount_paid: money(amount_paid),
      balance_due: balance,
      sent_at: inv.status === 'draft' ? null : isoStamp(issuedOffset),
      sent_via: inv.status === 'draft' ? null : 'email',
      created_by: users.rachel,
      created_at: isoStamp(issuedOffset),
    })
    done(`${row.invoice_number} — ${inv.status} — $${total.toLocaleString()} (balance $${balance.toLocaleString()})`)
  }
}

// ---------------------------------------------------------------------------
// 7. Field photos through the real R2 pipeline
// ---------------------------------------------------------------------------

const CATEGORY_TINT = {
  hazard: { r: 74, g: 60, b: 52 },
  overview: { r: 58, g: 66, b: 74 },
  access: { r: 66, g: 62, b: 58 },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Placeholder site imagery. These are generated, not real site photos — they
 * carry the same stamp overlay the production pipeline applies so the gallery
 * reads correctly, and are meant to be swapped for real photographs before
 * any external use.
 */
async function renderPhoto({ caption, location, capturedAt, category, stamped }) {
  const tint = CATEGORY_TINT[category] ?? CATEGORY_TINT.overview
  const W = 1280
  const H = 960

  const base = sharp({
    create: { width: W, height: H, channels: 3, background: tint },
  })

  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
          <stop offset="55%" stop-color="#000000" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.42"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <text x="60" y="${H / 2 - 10}" font-family="Helvetica, Arial, sans-serif" font-size="34"
            fill="#ffffff" fill-opacity="0.62">${esc(location)}</text>
      <text x="60" y="${H / 2 + 36}" font-family="Helvetica, Arial, sans-serif" font-size="24"
            fill="#ffffff" fill-opacity="0.42">Placeholder image — replace with site photography</text>
      ${
        stamped
          ? `<rect x="0" y="${H - 132}" width="${W}" height="132" fill="#000000" fill-opacity="0.62"/>
             <text x="40" y="${H - 88}" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="#ffffff">${esc(caption)}</text>
             <text x="40" y="${H - 50}" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#ffffff" fill-opacity="0.8">${esc(location)}  ·  ${capturedAt}</text>
             <text x="${W - 40}" y="${H - 50}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#ffffff" fill-opacity="0.8">SUMMIT ABATEMENT</text>`
          : ''
      }
    </svg>`)

  return base.composite([{ input: overlay, top: 0, left: 0 }]).jpeg({ quality: 82 }).toBuffer()
}

const buildOriginalKey = (orgId, surveyId, category, photoId) =>
  `${orgId}/originals/surveys/${surveyId}/${category}/${photoId}.jpg`
const buildStampedKey = (orgId, surveyId, category, photoId) =>
  `${orgId}/stamped/surveys/${surveyId}/${category}/${photoId}.jpg`

async function seedPhotos(orgId, contactIds, companyIds, surveyIds) {
  step('Field photos (generated, uploaded to R2)')
  let count = 0

  for (const survey of SURVEYS.filter((s) => s.photos > 0)) {
    const plan = PHOTO_PLAN[survey.key] ?? []
    const surveyId = surveyIds[survey.key]
    const contact = CONTACTS.find((c) => c.key === survey.contactKey)
    const capturedAtLabel = dayShift(survey.scheduledOffset).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    for (let i = 0; i < survey.photos; i++) {
      const spec = plan[i % plan.length]
      const photoId = randomUUID()
      const originalKey = buildOriginalKey(orgId, surveyId, spec.category, photoId)
      const stampedKey = buildStampedKey(orgId, surveyId, spec.category, photoId)

      const original = await renderPhoto({ ...spec, capturedAt: capturedAtLabel, stamped: false })
      const stamped = await renderPhoto({ ...spec, capturedAt: capturedAtLabel, stamped: true })

      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: originalKey,
          Body: original,
          ContentType: 'image/jpeg',
        }),
      )
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: stampedKey,
          Body: stamped,
          ContentType: 'image/jpeg',
        }),
      )

      await insert(
        'survey_photos',
        {
          organization_id: orgId,
          site_survey_id: surveyId,
          customer_id: contactIds[survey.contactKey],
          company_id: contact.companyKey ? companyIds[contact.companyKey] : null,
          legacy_id: photoId,
          category: spec.category,
          location: spec.location,
          caption: spec.caption,
          captured_at: isoStamp(survey.scheduledOffset),
          captured_at_source: 'exif',
          captured_lat: 39.7392 + (Math.random() - 0.5) * 0.05,
          captured_lng: -104.9903 + (Math.random() - 0.5) * 0.05,
          device_make: 'Apple',
          device_model: 'iPhone 15 Pro',
          media_type: 'image',
          mime_type: 'image/jpeg',
          file_size: original.length,
          file_hash: createHash('sha256').update(original).digest('hex'),
          original_r2_key: originalKey,
          stamped_r2_key: stampedKey,
          tier: 'hot',
          tier_changed_at: isoStamp(0),
          expires_at: isoStamp(365),
          stamp_status: 'stamped',
        },
        'survey_photos',
      )
      count++
    }
    done(`${survey.job_name} — ${survey.photos} photos`)
  }
  console.log(`  ${count} photos uploaded (original + stamped = ${count * 2} R2 objects)`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seeding "${ORG.name}" — ${PROFILE.label}\n${'='.repeat(52)}`)

  const orgId = await ensureOrg()
  const users = await ensureTeam(orgId)
  await wipe(orgId)

  const companyIds = await seedCompanies(orgId, users)
  const contactIds = await seedContacts(orgId, users, companyIds)
  const propertyIds = await seedProperties(orgId, users, contactIds)
  const opportunityIds = await seedOpportunities(orgId, users, companyIds, contactIds, propertyIds)
  const surveyIds = await seedSurveys(orgId, users, contactIds, propertyIds)
  const estimateIds = await seedEstimates(orgId, users, contactIds, surveyIds)
  const proposalIds = await seedProposals(orgId, users, contactIds, estimateIds)
  const jobIds = await seedJobs(
    orgId,
    users,
    contactIds,
    companyIds,
    propertyIds,
    opportunityIds,
    estimateIds,
    proposalIds,
    surveyIds,
  )
  const labIds = await seedLabs(orgId)
  await seedLabReports(orgId, users, labIds, contactIds, propertyIds)
  await seedInvoices(orgId, users, contactIds, jobIds)
  await seedPhotos(orgId, contactIds, companyIds, surveyIds)

  console.log(`\n${'='.repeat(52)}`)
  console.log('Demo tenant ready.\n')
  console.log(`  Organisation : ${ORG.name} (${orgId})`)
  console.log(`  Sign in as   : ${TEAM[0].email}`)
  console.log(`  Password     : ${PASSWORD}`)
  console.log(`\n  All ${TEAM.length} logins share that password:`)
  for (const m of TEAM) console.log(`    ${m.role.padEnd(13)} ${m.email}`)
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
