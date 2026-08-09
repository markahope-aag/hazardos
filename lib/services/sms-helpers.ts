import twilio from 'twilio';
import type { OrganizationSmsSettings } from '@/types/sms';

/**
 * Credential resolution, phone normalization, branding and quiet hours: the
 * parts of SMS delivery that are decisions rather than I/O.
 *
 * Split out of sms-service.ts (913 lines). These were private statics on
 * SmsService and are exported here so the send path can import them, and so
 * they can be tested without standing up a Supabase client.
 */

export function getTwilioClient(settings: OrganizationSmsSettings): {
  client: ReturnType<typeof twilio> | null;
  fromNumber: string | null;
} {
  // If org uses platform-level Twilio, fall back to env vars
  if (settings.use_platform_twilio) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const phone = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !phone) {
      return { client: null, fromNumber: null };
    }

    return { client: twilio(sid, token), fromNumber: phone };
  }

  // Organization has their own Twilio credentials configured
  if (!settings.twilio_account_sid || !settings.twilio_auth_token || !settings.twilio_phone_number) {
    return { client: null, fromNumber: null };
  }

  return {
    client: twilio(settings.twilio_account_sid, settings.twilio_auth_token),
    fromNumber: settings.twilio_phone_number,
  };
}

/** Get the auth token used for webhook signature validation */
export function getAuthTokenForSettings(settings: OrganizationSmsSettings | null): string | null {
  if (!settings) return null;
  if (settings.use_platform_twilio) {
    return process.env.TWILIO_AUTH_TOKEN || null;
  }
  return settings.twilio_auth_token || null;
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  // US: 10 digits
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // US with country code: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Already E.164 format
  if (phone.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Prepend the org's brand prefix to an outbound SMS body, unless the
 * body already starts with the prefix (in any casing). Returns the
 * input unchanged if no prefix is configured.
 */
export function applyBrandPrefix(body: string, prefix: string | null | undefined): string {
  const trimmed = (prefix || '').trim();
  if (!trimmed) return body;
  const wrapped = `[${trimmed}] `;
  const lower = body.toLowerCase();
  if (lower.startsWith(wrapped.toLowerCase())) return body;
  // Also catch the un-bracketed form so "Acme: hi" doesn't become
  // "[Acme] Acme: hi" if the user types the brand name themselves.
  if (lower.startsWith(`${trimmed.toLowerCase()}:`) || lower.startsWith(`${trimmed.toLowerCase()} `)) {
    return body;
  }
  return wrapped + body;
}

export function isQuietHours(settings: OrganizationSmsSettings): boolean {
  const now = new Date();
  // Convert to org timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTime = formatter.format(now);

  const start = settings.quiet_hours_start;
  const end = settings.quiet_hours_end;

  // Handle overnight quiet hours (e.g., 21:00 - 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
}
