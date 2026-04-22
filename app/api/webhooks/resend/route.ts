import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhooks/resend
 *
 * Receives delivery lifecycle events from Resend: email.sent,
 * email.delivered, email.bounced, email.complained, email.opened,
 * email.clicked, email.delivery_delayed. We mirror the relevant
 * transitions onto the `email_sends` row keyed by provider_message_id.
 *
 * Signature verification: Resend signs webhooks with Svix. If
 * RESEND_WEBHOOK_SECRET is set, we verify the `svix-signature` header
 * against the raw body. Without the secret (development) we accept
 * unsigned payloads — do NOT leave the secret unset in production.
 */

interface ResendEvent {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string[]
    subject?: string
    bounce?: { message?: string }
    click?: { link?: string }
    // There are more fields; we only pull what the audit row needs.
  }
}

function verifySvixSignature(
  secret: string,
  body: string,
  id: string | null,
  timestamp: string | null,
  signature: string | null,
): boolean {
  if (!id || !timestamp || !signature) return false

  // Svix secrets are prefixed with "whsec_"; drop it and base64-decode.
  const clean = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const key = Buffer.from(clean, 'base64')

  const toSign = `${id}.${timestamp}.${body}`
  const expected = crypto.createHmac('sha256', key).update(toSign).digest('base64')
  const expectedHeader = `v1,${expected}`

  // The header can contain multiple space-separated `vN,sig` entries.
  // Match any one of them.
  return signature.split(' ').some((candidate) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expectedHeader))
    } catch {
      return false
    }
  })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET

  if (secret) {
    const id = request.headers.get('svix-id')
    const ts = request.headers.get('svix-timestamp')
    const sig = request.headers.get('svix-signature')
    if (!verifySvixSignature(secret, rawBody, id, ts, sig)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let event: ResendEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messageId = event.data?.email_id
  if (!messageId) {
    return NextResponse.json({ ok: true, skipped: 'no email_id' })
  }

  const supabase = createAdminClient()

  const { data: row } = await supabase
    .from('email_sends')
    .select('id, open_count, click_count')
    .eq('provider_message_id', messageId)
    .single()

  if (!row) {
    // Could be a send that predates this system, or a test. Ignore.
    return NextResponse.json({ ok: true, skipped: 'no matching audit row' })
  }

  const nowIso = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  switch (event.type) {
    case 'email.sent':
      updates.status = 'sent'
      updates.sent_at = nowIso
      break

    case 'email.delivered':
      updates.status = 'delivered'
      updates.delivered_at = nowIso
      break

    case 'email.bounced':
      updates.status = 'bounced'
      updates.bounced_at = nowIso
      if (event.data?.bounce?.message) {
        updates.error_message = event.data.bounce.message
      }
      break

    case 'email.complained':
      updates.status = 'complained'
      updates.complained_at = nowIso
      break

    case 'email.opened':
      updates.open_count = (row.open_count ?? 0) + 1
      updates.last_opened_at = nowIso
      if (row.open_count === 0) {
        updates.first_opened_at = nowIso
      }
      break

    case 'email.clicked':
      updates.click_count = (row.click_count ?? 0) + 1
      if (row.click_count === 0) {
        updates.first_clicked_at = nowIso
      }
      break

    case 'email.delivery_delayed':
      // Stays in 'sent'; surfaced if the caller inspects delivered_at.
      break

    default:
      // Unknown event type — acknowledge so Resend stops retrying.
      return NextResponse.json({ ok: true, skipped: `unhandled ${event.type}` })
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('email_sends').update(updates).eq('id', row.id)
  }

  return NextResponse.json({ ok: true })
}
