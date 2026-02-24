import { NextRequest } from 'next/server';
import twilio from 'twilio';

/**
 * Validates that an incoming request was signed by Twilio using
 * the X-Twilio-Signature header and the account's auth token.
 */
export function validateTwilioSignature(
  request: NextRequest,
  params: Record<string, string>
): boolean {
  const signature = request.headers.get('X-Twilio-Signature');
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!signature || !authToken) return false;

  const url = request.url;
  return twilio.validateRequest(authToken, signature, url, params);
}
