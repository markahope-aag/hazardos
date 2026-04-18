import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { SmsService } from '@/lib/services/sms-service'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { createClient } from '@/lib/supabase/server'
import { createRequestLogger, formatError } from '@/lib/utils/logger'

// Twilio inbound SMS webhook. Responsibilities:
//   - Verify the Twilio signature on the inbound HTTP request.
//   - Resolve which organization the message belongs to (non-trivial when
//     multiple orgs share the platform Twilio number).
//   - Persist the message to sms_messages so it shows up in the inbox.
//   - Dispatch STOP/START/etc. keyword handling.
// The TwiML response is always empty — replies are sent via the app, not
// auto-composed at the webhook.
export async function POST(request: NextRequest) {
  const log = createRequestLogger({
    requestId: crypto.randomUUID(),
    method: 'POST',
    path: '/api/webhooks/twilio/inbound',
    userAgent: request.headers.get('user-agent') || undefined,
  })

  const emptyTwiml = (status = 200) =>
    new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status,
      headers: { 'Content-Type': 'text/xml' },
    })

  try {
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'webhook')
    if (rateLimitResponse) return rateLimitResponse

    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    const toNumber = formData.get('To') as string
    const fromNumber = formData.get('From') as string
    const body = formData.get('Body') as string
    const twilioSid = formData.get('MessageSid') as string | null

    if (!toNumber) {
      log.warn('Missing To phone number in webhook')
      return new NextResponse('Bad Request', { status: 400 })
    }

    const supabase = await createClient()
    let authToken: string | null = null
    let organizationId: string | null = null
    let resolution: 'dedicated' | 'platform-by-prior-contact' | 'platform-fallback' | 'none' = 'none'

    // 1. Dedicated number: an org-specific twilio_phone_number matches `To`.
    const { data: dedicated } = await supabase
      .from('organization_sms_settings')
      .select('twilio_auth_token, organization_id, use_platform_twilio')
      .eq('twilio_phone_number', toNumber)
      .maybeSingle()

    if (dedicated) {
      organizationId = dedicated.organization_id
      authToken = dedicated.use_platform_twilio
        ? process.env.TWILIO_AUTH_TOKEN || null
        : dedicated.twilio_auth_token
      resolution = 'dedicated'
    }

    // 2. Platform-shared number: `To` matches the shared Twilio number, so
    //    we disambiguate by looking up the most recent OUTBOUND message sent
    //    to `from` (the customer's phone) and trusting that row's org.
    //    This matches the customer's most recent interaction, which is the
    //    correct answer in practice — the customer is replying to whoever
    //    most recently texted them.
    if (!organizationId && toNumber === process.env.TWILIO_PHONE_NUMBER) {
      authToken = process.env.TWILIO_AUTH_TOKEN || null

      const { data: priorOutbound } = await supabase
        .from('sms_messages')
        .select('organization_id')
        .eq('direction', 'outbound')
        .eq('to_phone', fromNumber)
        .order('queued_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (priorOutbound) {
        organizationId = priorOutbound.organization_id
        resolution = 'platform-by-prior-contact'
      } else {
        // No prior outbound — fall back to any org configured for shared
        // Twilio. This is the "cold" first-contact case; we pick the first
        // enabled org and log a warning so ops can investigate if it turns
        // out to be wrong.
        const { data: platformOrgs } = await supabase
          .from('organization_sms_settings')
          .select('organization_id')
          .eq('use_platform_twilio', true)
          .eq('sms_enabled', true)
          .limit(1)
        if (platformOrgs?.length) {
          organizationId = platformOrgs[0].organization_id
          resolution = 'platform-fallback'
          log.warn(
            { toNumber, fromNumber },
            'inbound on shared Twilio with no prior outbound — falling back to first enabled org',
          )
        }
      }
    }

    if (!authToken || !organizationId) {
      log.warn(
        { toNumber, fromNumber },
        'no organization resolved for inbound SMS; dropping',
      )
      return emptyTwiml()
    }

    // Signature verification — uses whichever auth token we just resolved.
    const twilioSignature = request.headers.get('X-Twilio-Signature')
    if (!twilioSignature) {
      log.warn('Missing X-Twilio-Signature header')
      return new NextResponse('Unauthorized', { status: 401 })
    }
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || request.url
    const isValid = twilio.validateRequest(authToken, twilioSignature, webhookUrl, params)
    if (!isValid) {
      log.warn({ organizationId }, 'Invalid Twilio signature for organization')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Match the customer by phone number within the resolved org. Phone
    // normalization is cheap here — we try a few common shapes.
    let customerId: string | null = null
    if (fromNumber) {
      const candidates = buildPhoneMatchCandidates(fromNumber)
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', organizationId)
        .or(candidates.map((p) => `phone.eq.${p},mobile_phone.eq.${p}`).join(','))
        .limit(1)
        .maybeSingle()
      customerId = customer?.id ?? null
    }

    // Persist the inbound message before keyword handling so the inbox
    // always reflects reality even if downstream logic throws.
    const { error: insertErr } = await supabase.from('sms_messages').insert({
      organization_id: organizationId,
      customer_id: customerId,
      direction: 'inbound',
      from_phone: fromNumber,
      to_phone: toNumber,
      message_type: 'incoming_message',
      body: body || '',
      twilio_message_sid: twilioSid,
      status: 'delivered',
      received_at: new Date().toISOString(),
    })
    if (insertErr) {
      log.error(
        { err: formatError(insertErr), organizationId, resolution },
        'failed to persist inbound SMS',
      )
    }

    if (fromNumber && body) {
      await SmsService.handleInboundKeyword(fromNumber, body)
    }

    return emptyTwiml()
  } catch (error) {
    log.error(
      { error: formatError(error, 'TWILIO_INBOUND_WEBHOOK_ERROR') },
      'Twilio inbound webhook error',
    )
    return emptyTwiml()
  }
}

// Generates common shapes of a phone number so a customer whose DB row has
// "(555) 123-4567" still matches a Twilio "+15551234567".
function buildPhoneMatchCandidates(raw: string): string[] {
  const digits = raw.replace(/\D+/g, '')
  const trimmed = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  const candidates = new Set<string>()
  candidates.add(raw)
  candidates.add(digits)
  candidates.add(trimmed)
  if (trimmed.length === 10) {
    candidates.add(`+1${trimmed}`)
    candidates.add(`(${trimmed.slice(0, 3)}) ${trimmed.slice(3, 6)}-${trimmed.slice(6)}`)
    candidates.add(`${trimmed.slice(0, 3)}-${trimmed.slice(3, 6)}-${trimmed.slice(6)}`)
  }
  return [...candidates].filter(Boolean)
}
