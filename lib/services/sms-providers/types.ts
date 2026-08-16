import type { OrganizationSmsSettings } from '@/types/sms';

/**
 * The seam between "we decided to send an SMS" and "a vendor actually sent it".
 *
 * Everything that is policy rather than transport stays in SmsService: opt-in
 * and opt-out state, STOP/START keyword handling, quiet hours, brand prefixing,
 * and the message log. A provider only has to take a normalized number and a
 * final body and report what happened.
 *
 * Keeping the interface this narrow is what makes a second provider cheap. It
 * also means the compliance logic cannot accidentally diverge per vendor, which
 * is the part you least want duplicated.
 */

export type SmsProviderName = 'twilio' | 'ringcentral';

/** What the vendor told us about a message we just handed over. */
export interface SendResult {
  /** Vendor-side identifier, stored on sms_messages.provider_message_id. */
  providerMessageId: string;
  /**
   * Billable segment count where the vendor reports one. RingCentral does not
   * return this on send, so it is optional and defaults to 1 at the call site
   * rather than being guessed here.
   */
  segments?: number;
  /**
   * The vendor's own status string, kept verbatim for logging. Mapping it onto
   * our own status vocabulary is the caller's job.
   */
  rawStatus?: string;
}

/** Raised when a provider rejects a send. Carries a vendor code for the log. */
export class SmsProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN',
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'SmsProviderError';
  }
}

export interface SmsProvider {
  readonly name: SmsProviderName;

  /**
   * True when this organization has enough configuration to send. Checked
   * before a message row is written, so a misconfigured org fails fast with a
   * useful message instead of leaving a queued record behind.
   */
  isConfigured(): boolean;

  /** Human-readable explanation of what is missing, for the settings screen. */
  describeMissingConfig(): string;

  /** The number messages will appear to come from. */
  getFromNumber(): string | null;

  send(params: { to: string; body: string }): Promise<SendResult>;
}

export interface SmsProviderFactory {
  (settings: OrganizationSmsSettings): SmsProvider;
}
