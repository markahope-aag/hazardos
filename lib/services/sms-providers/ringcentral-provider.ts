import type { OrganizationSmsSettings } from '@/types/sms';
import { SmsProviderError, type SendResult, type SmsProvider } from './types';

/**
 * RingCentral SMS, for clients who already run their phone system there and do
 * not want a separate Twilio account.
 *
 * Two things differ from Twilio in ways that matter:
 *
 * 1. Auth is a two-step exchange, not a static credential pair. A long-lived
 *    JWT is traded at /restapi/oauth/token for a short-lived access token
 *    (grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer), and that token
 *    is what signs API calls. Tokens are cached in-process until shortly before
 *    expiry so a burst of messages does not re-authenticate per message.
 *
 * 2. The send response reports `messageStatus` ("Queued" and so on) rather than
 *    a delivery outcome, and no segment count. Delivery is confirmed later
 *    through the message-store endpoint, so a send here means accepted, not
 *    delivered. The Twilio provider makes the same distinction, which is why
 *    the message log records 'sent' rather than 'delivered' either way.
 *
 * API shapes verified against RingCentral's published documentation rather than
 * assumed: POST /restapi/v1.0/account/~/extension/~/sms with
 * { from: { phoneNumber }, to: [{ phoneNumber }], text }.
 */

const TOKEN_PATH = '/restapi/oauth/token';
const SMS_PATH = '/restapi/v1.0/account/~/extension/~/sms';
const JWT_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

/** Refresh a little before the token actually dies, to avoid a race mid-send. */
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Keyed by organization so a multi-tenant process never hands one client's
 * token to another. Module-level, so it survives between requests in a warm
 * serverless instance and is simply rebuilt on a cold start.
 */
const tokenCache = new Map<string, CachedToken>();

/** Exported for tests, which need to prove the cache is actually consulted. */
export function clearRingCentralTokenCache(): void {
  tokenCache.clear();
}

export class RingCentralProvider implements SmsProvider {
  readonly name = 'ringcentral' as const;

  constructor(private readonly settings: OrganizationSmsSettings) {}

  isConfigured(): boolean {
    return Boolean(
      this.settings.ringcentral_client_id &&
        this.settings.ringcentral_client_secret &&
        this.settings.ringcentral_jwt &&
        this.settings.ringcentral_from_number
    );
  }

  describeMissingConfig(): string {
    const missing: string[] = [];
    if (!this.settings.ringcentral_client_id) missing.push('Client ID');
    if (!this.settings.ringcentral_client_secret) missing.push('Client Secret');
    if (!this.settings.ringcentral_jwt) missing.push('JWT');
    if (!this.settings.ringcentral_from_number) missing.push('From Number');
    return `RingCentral credentials not configured. Missing: ${missing.join(', ')}. Add them in Settings → SMS.`;
  }

  getFromNumber(): string | null {
    return this.settings.ringcentral_from_number ?? null;
  }

  private get baseUrl(): string {
    // Trailing slashes here produce a double slash and a 404 that reads like an
    // auth failure, so normalize rather than trusting what was typed in.
    const raw = this.settings.ringcentral_server_url || 'https://platform.ringcentral.com';
    return raw.replace(/\/+$/, '');
  }

  private async getAccessToken(): Promise<string> {
    const cacheKey = `${this.settings.organization_id}:${this.baseUrl}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

    const basic = Buffer.from(
      `${this.settings.ringcentral_client_id}:${this.settings.ringcentral_client_secret}`
    ).toString('base64');

    const res = await fetch(`${this.baseUrl}${TOKEN_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: JWT_GRANT,
        assertion: this.settings.ringcentral_jwt as string,
      }).toString(),
    });

    const text = await res.text();
    if (!res.ok) {
      // RingCentral returns OAuth-style { error, error_description }. Surface
      // the description because "invalid_grant" alone sends people hunting the
      // wrong credential; it usually means an expired JWT or the wrong host.
      let detail = text.slice(0, 200);
      try {
        const parsed = JSON.parse(text) as { error?: string; error_description?: string };
        detail = parsed.error_description || parsed.error || detail;
      } catch {
        /* keep the raw body */
      }
      throw new SmsProviderError(
        `RingCentral authentication failed: ${detail}`,
        'RC_AUTH_FAILED',
        res.status >= 500
      );
    }

    const token = JSON.parse(text) as { access_token: string; expires_in: number };
    tokenCache.set(cacheKey, {
      accessToken: token.access_token,
      expiresAt: Date.now() + Math.max(0, token.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS),
    });
    return token.access_token;
  }

  async send({ to, body }: { to: string; body: string }): Promise<SendResult> {
    if (!this.isConfigured()) {
      throw new SmsProviderError(this.describeMissingConfig(), 'RC_NOT_CONFIGURED');
    }

    const accessToken = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}${SMS_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { phoneNumber: this.settings.ringcentral_from_number },
        to: [{ phoneNumber: to }],
        text: body,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 250);
      let code = `RC_HTTP_${res.status}`;
      try {
        const parsed = JSON.parse(text) as { message?: string; errorCode?: string };
        detail = parsed.message || detail;
        if (parsed.errorCode) code = parsed.errorCode;
      } catch {
        /* keep the raw body */
      }
      // 401 here means the cached token went stale early; drop it so the next
      // attempt re-authenticates rather than replaying a dead token.
      if (res.status === 401) tokenCache.delete(`${this.settings.organization_id}:${this.baseUrl}`);
      throw new SmsProviderError(
        `RingCentral send failed: ${detail}`,
        code,
        res.status === 429 || res.status >= 500
      );
    }

    const sent = JSON.parse(text) as { id?: number | string; messageStatus?: string };
    if (sent.id === undefined || sent.id === null) {
      throw new SmsProviderError('RingCentral accepted the message but returned no id', 'RC_NO_ID');
    }

    return {
      providerMessageId: String(sent.id),
      rawStatus: sent.messageStatus,
      // RingCentral does not report segments on send. Left undefined rather
      // than guessed, so the log does not carry an invented number.
    };
  }
}
