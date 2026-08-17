# Environment variables

Every variable the code reads, what it does, and **what breaks without it**.

Compiled 2026-08-17 by grepping `process.env.*` across `lib/`, `app/` and
`scripts/`: 45 variables. Regenerate the list with:

```bash
grep -rhoE 'process\.env\.[A-Z][A-Z0-9_]{2,}' lib app scripts | sort -u
```

## Why this file exists

`OPENAI_API_KEY` was absent from production and voice transcription failed
silently for an unknown length of time. It appeared in no list, so nobody could
have checked it. Twenty-seven of these forty-five were documented nowhere at
all.

The failure mode is always the same: a feature that needs a key degrades quietly
rather than refusing to start, and nobody notices until someone tries to use it.
**The "breaks without it" column is the point of this document.**

---

## Required to boot

Missing any of these and the app does not work at all.

| Variable | Purpose | Without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Nothing connects |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-side Supabase key | No client can authenticate |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key that bypasses RLS | Admin paths, webhooks and cron all fail |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL | CORS and every generated link break |

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security completely. It belongs
only in server code and never in anything prefixed `NEXT_PUBLIC_`.

## Required in production

| Variable | Purpose | Without it |
|---|---|---|
| `CRON_SECRET` | Authorizes the four cron routes | Cron endpoints reject every call, so reminders, automation events, photo lifecycle and credential expiry all stop |
| `SECRETS_ENCRYPTION_KEY` | Encrypts stored integration secrets | Integration credentials cannot be read or written |
| `RESEND_API_KEY` | Outbound email | No email at all: invitations, password resets, automation sends |
| `RESEND_DOMAIN` | Sending domain | Mail sends from the wrong identity or fails |
| `RESEND_PLATFORM_DOMAIN` | Fallback sender for orgs without a verified domain | Orgs that have not verified a domain cannot send |
| `RESEND_WEBHOOK_SECRET` | Verifies Resend webhooks | Bounces are not recorded, so the `message_failed` automation trigger never fires |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Rate limits do not apply |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Rate limits do not apply |

## Storage

All four are needed together. There is no partial mode.

| Variable | Without it |
|---|---|
| `R2_ACCOUNT_ID` | The whole survey photo pipeline: upload, stamping, retention |
| `R2_BUCKET` | as above |
| `R2_ACCESS_KEY_ID` | as above |
| `R2_SECRET_ACCESS_KEY` | as above |

Check them with `node scripts/check-r2.mjs`.

## AI features

Both keys are needed, and they do different jobs. This is the pair that caused
the silent failure.

| Variable | Purpose | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Estimate suggestions, photo analysis, and cleaning up voice transcripts | Those features fail |
| `OPENAI_API_KEY` | Whisper transcription | **Voice notes fail.** Currently absent in production |

Voice needs **both**: Whisper transcribes, Claude tidies the text afterwards.
Setting only `ANTHROPIC_API_KEY` looks like it should work and does not.

Separately, AI is **consent-gated per organization**. Every org starts with
`ai_enabled` false in `organization_ai_settings` and grants it in
Settings → AI & Automation. Both the key and the consent must be present.

## SMS

| Variable | Purpose | Without it |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account | No SMS via Twilio |
| `TWILIO_AUTH_TOKEN` | Twilio auth, also verifies inbound webhooks | No SMS, and inbound webhooks cannot be verified |
| `TWILIO_PHONE_NUMBER` | Sending number | No SMS |
| `TWILIO_WEBHOOK_URL` | Inbound webhook target | **STOP replies are not captured**, which is a compliance matter |
| `TWILIO_STATUS_WEBHOOK_URL` | Delivery status callbacks | Delivery failures are not recorded, so the `message_failed` trigger never fires for SMS |

RingCentral is a second provider, configured per organization in the database
rather than by environment variable. Its inbound and delivery-status handling is
not built, so **STOP replies are not captured on RingCentral at all**.

## Payments

| Variable | Without it |
|---|---|
| `STRIPE_SECRET_KEY` | No subscription billing |
| `STRIPE_WEBHOOK_SECRET` | Subscription state stops updating after checkout |

## Integrations

Each pair is optional. Absent, that integration is simply unavailable; nothing
else is affected.

| Variables | Integration |
|---|---|
| `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_ENVIRONMENT` | QuickBooks invoice sync. `QBO_ENVIRONMENT` is `sandbox` or `production` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Calendar sync |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | Outlook Calendar sync |
| `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` | HubSpot |
| `MAILCHIMP_CLIENT_ID`, `MAILCHIMP_CLIENT_SECRET` | Mailchimp |
| `MAPBOX_ACCESS_TOKEN` | Reverse geocoding on survey addresses |

Check Mapbox with `node scripts/check-mapbox.mjs`.

## Runtime and tooling

| Variable | Notes |
|---|---|
| `NODE_ENV` | Set by the platform. Gates analytics and CORS behavior |
| `NEXT_PHASE` | Set by Next.js during build. `lib/env.ts` uses it to skip validation at build time |
| `LOG_LEVEL` | Pino level. Defaults sensibly |

## Scripts only

Never needed by the running app.

| Variable | Used by |
|---|---|
| `DATABASE_URL`, `SUPABASE_DB_URL`, `SUPABASE_TEST_DB_URL` | `scripts/db-advisors.mjs`. Pass a pooler URL with a URL-encoded password from Windows |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | `scripts/check-live-redirect.mjs` |

---

## Where they live

**Locally:** `.env.local`, which is gitignored.

**Production:** Vercel project settings. Environment variables apply **at build
time**, so adding one requires a redeploy before it takes effect. This is the
second half of the `OPENAI_API_KEY` story: setting it is not enough.

**Standalone scripts** load from 1Password rather than a plaintext file. `_env.mjs`
reads the `hazardos__.env.local` and `hazardos.env` documents from the
`DevBox .env Files` vault at import, bootstrapping its service-account token from
`~/.claude/.env.credentials`. Scripts that need env import it directly:

```js
import './_env.mjs'
```

## When adding a variable

Add it here with what breaks without it, and add it to `.env.example` with a
placeholder. A variable that only exists in someone's local file is a production
incident waiting for the next deploy.
