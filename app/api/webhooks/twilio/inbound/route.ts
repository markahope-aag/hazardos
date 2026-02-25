import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { SmsService } from '@/lib/services/sms-service';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createRequestLogger, formatError } from '@/lib/utils/logger';

// Twilio inbound SMS webhook - handles opt-out keywords
export async function POST(request: NextRequest) {
  const log = createRequestLogger({
    requestId: crypto.randomUUID(),
    method: 'POST',
    path: '/api/webhooks/twilio/inbound',
    userAgent: request.headers.get('user-agent') || undefined,
  });

  try {
    // Apply rate limiting for webhooks
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'webhook');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse Twilio webhook (form data)
    const formData = await request.formData();

    // Build params object from form data
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Extract the "To" number (the organization's Twilio phone number)
    const toNumber = formData.get('To') as string;
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;

    if (!toNumber) {
      log.warn('Missing To phone number in webhook');
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Look up the organization by their Twilio phone number
    const supabase = await createClient();
    const { data: smsSettings, error } = await supabase
      .from('organization_sms_settings')
      .select('twilio_auth_token, organization_id')
      .eq('twilio_phone_number', toNumber)
      .maybeSingle();

    if (error || !smsSettings?.twilio_auth_token) {
      log.warn(
        { 
          toNumber,
          error: error ? formatError(error, 'SMS_SETTINGS_LOOKUP_ERROR') : undefined
        },
        'No organization found for phone number'
      );
      // Return success to prevent Twilio retries, but don't process
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Verify Twilio signature using the organization's auth token
    const twilioSignature = request.headers.get('X-Twilio-Signature');

    if (!twilioSignature) {
      log.warn('Missing X-Twilio-Signature header');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the webhook URL (use configured URL or construct from request)
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || request.url;

    const isValid = twilio.validateRequest(
      smsSettings.twilio_auth_token,
      twilioSignature,
      webhookUrl,
      params
    );

    if (!isValid) {
      log.warn(
        { organizationId: smsSettings.organization_id },
        'Invalid Twilio signature for organization'
      );
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (from && body) {
      // Handle opt-out/opt-in keywords (STOP, START, etc.)
      await SmsService.handleInboundKeyword(from, body);
    }

    // Return empty TwiML response (no auto-reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error) {
    log.error(
      { error: formatError(error, 'TWILIO_INBOUND_WEBHOOK_ERROR') },
      'Twilio inbound webhook error'
    );
    // Return empty TwiML to prevent errors
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}
