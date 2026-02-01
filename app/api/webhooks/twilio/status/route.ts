import { NextRequest, NextResponse } from 'next/server';
import { SmsService } from '@/lib/services/sms-service';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';

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
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;

    if (!messageSid) {
      return NextResponse.json({ error: 'Missing MessageSid' }, { status: 400 });
    }

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
