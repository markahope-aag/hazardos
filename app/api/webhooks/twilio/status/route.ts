import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { SmsService } from '@/lib/services/sms-service';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createRequestLogger, formatError } from '@/lib/utils/logger';

// Twilio status callback webhook
export async function POST(request: NextRequest) {
  const log = createRequestLogger({
    requestId: crypto.randomUUID(),
    method: 'POST',
    path: '/api/webhooks/twilio/status',
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

    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;

    if (!messageSid) {
      return NextResponse.json({ error: 'Missing MessageSid' }, { status: 400 });
    }

    // Look up the message to get the organization
    const supabase = await createClient();
    const { data: message, error: msgError } = await supabase
      .from('sms_messages')
      .select('organization_id')
      .eq('twilio_message_sid', messageSid)
      .maybeSingle();

    if (msgError || !message) {
      log.warn(
        { 
          messageSid,
          error: msgError ? formatError(msgError, 'MESSAGE_LOOKUP_ERROR') : undefined
        },
        'No message found for SID'
      );
      // Return success to prevent Twilio retries
      return NextResponse.json({ success: true });
    }

    // Get the organization's Twilio auth token
    const { data: smsSettings, error: settingsError } = await supabase
      .from('organization_sms_settings')
      .select('twilio_auth_token, use_platform_twilio')
      .eq('organization_id', message.organization_id)
      .maybeSingle();

    // Resolve auth token: platform-level or org-level
    const authToken = smsSettings?.use_platform_twilio
      ? (process.env.TWILIO_AUTH_TOKEN || null)
      : smsSettings?.twilio_auth_token || null;

    if (settingsError || !authToken) {
      log.warn(
        {
          organizationId: message.organization_id,
          error: settingsError ? formatError(settingsError, 'SMS_SETTINGS_ERROR') : undefined
        },
        'No SMS settings found for organization'
      );
      return NextResponse.json({ success: true });
    }

    // Verify Twilio signature
    const twilioSignature = request.headers.get('X-Twilio-Signature');

    if (!twilioSignature) {
      log.warn('Missing X-Twilio-Signature header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookUrl = process.env.TWILIO_STATUS_WEBHOOK_URL || request.url;

    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      webhookUrl,
      params
    );

    if (!isValid) {
      log.warn(
        { messageSid },
        'Invalid Twilio signature for message'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update message status
    await SmsService.updateMessageStatus(
      messageSid,
      messageStatus,
      errorCode || undefined,
      errorMessage || undefined
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error(
      { error: formatError(error, 'TWILIO_STATUS_WEBHOOK_ERROR') },
      'Twilio status webhook error'
    );
    // Return 200 to prevent Twilio from retrying
    return NextResponse.json({ success: false });
  }
}
