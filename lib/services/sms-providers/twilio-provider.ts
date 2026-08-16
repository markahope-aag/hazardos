import { getTwilioClient } from '../sms-helpers';
import type { OrganizationSmsSettings } from '@/types/sms';
import { SmsProviderError, type SendResult, type SmsProvider } from './types';

/**
 * The existing Twilio path, moved behind the provider interface without any
 * change to what it does. Same credential resolution (organization keys, or the
 * platform account when use_platform_twilio is set), same status callback, same
 * segment reporting.
 *
 * This is deliberately a wrapper rather than a rewrite: every organization
 * currently sends through here, so the safe change is to leave the behavior
 * alone and only alter who calls it.
 */
export class TwilioProvider implements SmsProvider {
  readonly name = 'twilio' as const;

  constructor(private readonly settings: OrganizationSmsSettings) {}

  private resolve() {
    return getTwilioClient(this.settings);
  }

  isConfigured(): boolean {
    const { client, fromNumber } = this.resolve();
    return Boolean(client && fromNumber);
  }

  describeMissingConfig(): string {
    return this.settings.use_platform_twilio
      ? 'Platform Twilio credentials are not configured on the server (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).'
      : 'Twilio credentials not configured. Please add your Twilio Account SID, Auth Token, and Phone Number in Settings → SMS.';
  }

  getFromNumber(): string | null {
    return this.resolve().fromNumber;
  }

  async send({ to, body }: { to: string; body: string }): Promise<SendResult> {
    const { client, fromNumber } = this.resolve();
    if (!client || !fromNumber) {
      throw new SmsProviderError(this.describeMissingConfig(), 'TWILIO_NOT_CONFIGURED');
    }

    try {
      const message = await client.messages.create({
        body,
        from: fromNumber,
        to,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
      });

      return {
        providerMessageId: message.sid,
        segments: parseInt(message.numSegments || '1', 10),
        rawStatus: message.status,
      };
    } catch (error: unknown) {
      const twilioError = error as { code?: string | number; message?: string; status?: number };
      throw new SmsProviderError(
        twilioError.message || 'Twilio send failed',
        twilioError.code !== undefined ? String(twilioError.code) : 'UNKNOWN',
        twilioError.status === 429 || (twilioError.status ?? 0) >= 500
      );
    }
  }
}
