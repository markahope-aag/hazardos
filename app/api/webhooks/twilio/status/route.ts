import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { SmsService } from '@/lib/services/sms-service';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { createClient } from '@/lib/supabase/server';

// Twilio status callback webhook
export async function POST(request: NextRequest) {
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
      console.warn('No message found for SID:', messageSid);
      // Return success to prevent Twilio retries
      return NextResponse.json({ success: true });
    }

    // Get the organization's Twilio auth token
    const { data: smsSettings, error: settingsError } = await supabase
      .from('organization_sms_settings')
      .select('twilio_auth_token')
      .eq('organization_id', message.organization_id)
      .maybeSingle();

    if (settingsError || !smsSettings?.twilio_auth_token) {
      console.warn('No SMS settings found for organization:', message.organization_id);
      return NextResponse.json({ success: true });
    }

    // Verify Twilio signature
    const twilioSignature = request.headers.get('X-Twilio-Signature');

    if (!twilioSignature) {
      console.warn('Missing X-Twilio-Signature header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookUrl = process.env.TWILIO_STATUS_WEBHOOK_URL || request.url;

    const isValid = twilio.validateRequest(
      smsSettings.twilio_auth_token,
      twilioSignature,
      webhookUrl,
      params
    );

    if (!isValid) {
      console.warn('Invalid Twilio signature for message:', messageSid);
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
    console.error('Twilio status webhook error:', error);
    // Return 200 to prevent Twilio from retrying
    return NextResponse.json({ success: false });
  }
}
