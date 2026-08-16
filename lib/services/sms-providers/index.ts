import type { OrganizationSmsSettings } from '@/types/sms';
import { RingCentralProvider } from './ringcentral-provider';
import { TwilioProvider } from './twilio-provider';
import type { SmsProvider, SmsProviderName } from './types';

export { SmsProviderError } from './types';
export type { SmsProvider, SmsProviderName, SendResult } from './types';
export { RingCentralProvider } from './ringcentral-provider';
export { TwilioProvider } from './twilio-provider';

/**
 * Pick the provider for an organization.
 *
 * Anything unrecognized falls back to Twilio rather than throwing. The column
 * has a CHECK constraint, so an unknown value should be impossible; if one ever
 * appears the right failure is "sent through the old provider", not "SMS stops
 * working for that tenant".
 */
export function getSmsProvider(settings: OrganizationSmsSettings): SmsProvider {
  const provider = (settings.sms_provider ?? 'twilio') as SmsProviderName;
  switch (provider) {
    case 'ringcentral':
      return new RingCentralProvider(settings);
    case 'twilio':
    default:
      return new TwilioProvider(settings);
  }
}
