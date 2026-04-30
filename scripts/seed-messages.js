/**
 * Seed realistic SMS conversations for Acme Remediation (test org).
 *
 * Inserts a handful of threads with alternating inbound/outbound
 * messages so the /messages page has something to look at. Idempotent:
 * if any sms_messages already exist for the test org, refuses to run
 * so re-seeding doesn't pile up duplicates.
 *
 * Run:  node scripts/seed-messages.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const ORG_ID = '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f' // Acme Remediation
const ORG_FROM = '+17205550100' // pretend Twilio number for the org

// Customers we'll seed conversations for. IDs lifted from current DB.
const CUSTOMERS = {
  garcia: 'ca053cb7-9ed9-4856-891c-9e199f5589f6',     // Maria Garcia (Garcia Property Management)
  richardson: '7d1b5865-e297-42cc-9d4d-1e28abc40588', // Tom Richardson (Richardson Construction)
  wong: '42e29a9a-5264-4aba-ab33-891204565f01',       // Lisa Wong
  denver_school: 'f7abd82e-30de-4fee-a42f-8f345c8d7c12', // Jim Torres (Denver Schools)
  mvhoa: '7adfd1fd-6341-4d7a-ba34-80b4cd1f6c56',      // Dave Kowalski (Mountain View HOA)
}

// Customer phone numbers — match what's in the DB so the threads look real.
const PHONES = {
  garcia: '+13035550201',
  richardson: '+13035550202',
  wong: '+17205550204',
  denver_school: '+13035550303',
  mvhoa: '+13035550505',
}

// Each thread: array of { dir, body, minutesAgo, type? }
const THREADS = [
  {
    customer: 'garcia',
    label: 'Maria Garcia — appointment confirm',
    messages: [
      { dir: 'outbound', body: '[Acme Remediation] Hi Maria, confirming our team will be at 412 Elm St tomorrow (Wed) at 9 AM for the asbestos survey. Reply Y to confirm or call (303) 555-0100.', minutesAgo: 60 * 26, type: 'appointment_reminder' },
      { dir: 'inbound',  body: 'Y — see you then. Gate code is 4422.', minutesAgo: 60 * 25 },
      { dir: 'outbound', body: '[Acme Remediation] Got it, thanks. We\'ll text when we\'re 30 min out.', minutesAgo: 60 * 24 },
    ],
  },
  {
    customer: 'richardson',
    label: 'Tom Richardson — crew en route',
    messages: [
      { dir: 'outbound', body: '[Acme Remediation] Tom, our crew is 30 min out from the site at 1820 Industrial Pkwy. Driver: Jake.', minutesAgo: 60 * 4, type: 'job_status' },
      { dir: 'inbound',  body: 'Sounds good. I\'ll meet them at the loading dock.', minutesAgo: 60 * 4 - 5 },
      { dir: 'outbound', body: '[Acme Remediation] Just arrived. Containment going up now — expected 4-5 hours.', minutesAgo: 60 * 3 },
      { dir: 'inbound',  body: 'Thanks for the update.', minutesAgo: 60 * 3 - 10 },
    ],
  },
  {
    customer: 'wong',
    label: 'Lisa Wong — running late',
    messages: [
      { dir: 'outbound', body: '[Acme Remediation] Lisa, sorry — we\'re running about 45 min behind on the prior job. Rescheduled arrival: 11:15 AM. OK?', minutesAgo: 60 * 8, type: 'job_status' },
      { dir: 'inbound',  body: 'Honestly that\'s tight for me. Can we push to 1 PM?', minutesAgo: 60 * 8 - 6 },
      { dir: 'outbound', body: '[Acme Remediation] 1 PM works. We\'ll text you when we\'re 20 min out.', minutesAgo: 60 * 8 - 20 },
      { dir: 'inbound',  body: 'Perfect, thanks for the flexibility.', minutesAgo: 60 * 8 - 22 },
    ],
  },
  {
    customer: 'denver_school',
    label: 'Jim Torres — parking question',
    messages: [
      { dir: 'inbound',  body: 'Quick Q before tomorrow: where do your trucks park? We have a service drive on the west side.', minutesAgo: 60 * 18 },
      { dir: 'outbound', body: '[Acme Remediation] West service drive works. Two box trucks + a cargo van. Need 30 ft clearance for the wash station.', minutesAgo: 60 * 17 },
      { dir: 'inbound',  body: 'Plenty of room. I\'ll meet you there at 7:30.', minutesAgo: 60 * 17 - 8 },
    ],
  },
  {
    customer: 'mvhoa',
    label: 'Dave Kowalski — payment reminder',
    messages: [
      { dir: 'outbound', body: '[Acme Remediation] Dave, friendly reminder — invoice #INV-2078 ($4,210) is 5 days past due. Pay link: hazardos.app/pay/2078', minutesAgo: 60 * 30, type: 'payment_reminder' },
      { dir: 'inbound',  body: 'Sorry — submitting today.', minutesAgo: 60 * 28 },
      { dir: 'outbound', body: '[Acme Remediation] No problem, appreciate it. We\'ll send a receipt once it clears.', minutesAgo: 60 * 27 },
    ],
  },
  {
    customer: 'wong',
    label: 'Lisa Wong — survey follow-up (separate thread / same contact)',
    messages: [
      { dir: 'outbound', body: '[Acme Remediation] Hi Lisa — survey from yesterday is uploaded. Estimate going out by EOD tomorrow. Anything we should add?', minutesAgo: 60 * 14 },
      { dir: 'inbound',  body: 'Can you also quote the basement floor tile? Forgot to mention.', minutesAgo: 60 * 13 },
      { dir: 'outbound', body: '[Acme Remediation] Will do — surveyor noted the 12x12 dark green tiles. Including in the estimate.', minutesAgo: 60 * 12 },
      { dir: 'inbound',  body: 'Thanks!', minutesAgo: 60 * 12 - 4 },
    ],
  },
]

function tsAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

async function main() {
  // Idempotency: refuse if there are already messages for this org.
  const { count, error: countErr } = await supabase
    .from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID)

  if (countErr) {
    console.error('Failed to count existing messages:', countErr.message)
    process.exit(1)
  }

  if ((count ?? 0) > 0) {
    console.log(`Skipping seed: ${count} sms_messages already exist for Acme. Drop them first if you want to reseed.`)
    return
  }

  // Make sure the contacts we're seeding have sms_opt_in=true so the
  // thread page won't show the opted-out warning.
  const customerIds = Object.values(CUSTOMERS)
  const { error: optErr } = await supabase
    .from('customers')
    .update({ sms_opt_in: true, opted_into_sms: true })
    .in('id', customerIds)

  if (optErr) {
    console.error('Failed to opt-in seed contacts:', optErr.message)
    process.exit(1)
  }
  console.log(`Opted-in ${customerIds.length} contacts.`)

  const rows = []
  for (const thread of THREADS) {
    const cid = CUSTOMERS[thread.customer]
    const phone = PHONES[thread.customer]
    if (!cid || !phone) {
      console.warn(`Skipping ${thread.label}: missing customer/phone mapping`)
      continue
    }

    for (const m of thread.messages) {
      const queuedAt = tsAgo(m.minutesAgo)
      const isOutbound = m.dir === 'outbound'
      rows.push({
        organization_id: ORG_ID,
        customer_id: cid,
        direction: m.dir,
        from_phone: isOutbound ? ORG_FROM : phone,
        to_phone: isOutbound ? phone : ORG_FROM,
        body: m.body,
        message_type: m.type || 'general',
        status: isOutbound ? 'delivered' : 'delivered',
        queued_at: queuedAt,
        sent_at: isOutbound ? queuedAt : null,
        delivered_at: isOutbound ? queuedAt : null,
        received_at: isOutbound ? null : queuedAt,
        segments: 1,
      })
    }
  }

  console.log(`Inserting ${rows.length} messages across ${THREADS.length} threads...`)

  const { error: insertErr } = await supabase.from('sms_messages').insert(rows)
  if (insertErr) {
    console.error('Insert failed:', insertErr.message)
    process.exit(1)
  }

  console.log('Done. Refresh /messages to see the threads.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
