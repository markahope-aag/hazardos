import { NextRequest, NextResponse } from 'next/server';
import { SmsService } from '@/lib/services/sms-service';

// Twilio inbound SMS webhook - handles opt-out keywords
export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook (form data)
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;

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
    console.error('Twilio inbound webhook error:', error);
    // Return empty TwiML to prevent errors
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}
