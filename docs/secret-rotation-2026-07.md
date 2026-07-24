# Third-party secrets: encryption at rest (audit P1-9 / P1-10)

## Why

Until this change, these columns were stored **in plaintext** and the RLS policy
on each table was `FOR ALL` scoped only to `organization_id`, with no role
predicate. Any authenticated member of the owning organization — including a
`viewer` — could read *and* write them straight through PostgREST with the
public anon key.

The schema even carried a comment claiming `-- OAuth tokens (encrypted in
production)`. That was never true; nothing was encrypted anywhere.

| Table | Columns |
|---|---|
| `organization_integrations` | `access_token`, `refresh_token` (QuickBooks, HubSpot, Mailchimp, Google, Outlook) |
| `organization_sms_settings` | `twilio_account_sid`, `twilio_auth_token` |
| `webhooks` | `secret` (outbound HMAC signing key) |
| `lead_webhook_endpoints` | `api_key`, `secret` (inbound lead ingestion) |

## What changed

Secrets are now encrypted at rest with AES-256-GCM (`lib/utils/secret-crypto.ts`)
under a master key in `SECRETS_ENCRYPTION_KEY`. Ciphertext carries an `enc:v1:`
prefix; unprefixed values are treated as legacy plaintext and passed through, so
the code can be deployed before the backfill runs.

## Deploying

1. Generate a key:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Set `SECRETS_ENCRYPTION_KEY` in Vercel (all environments) and `.env.local`.
3. Deploy the app. It reads plaintext and ciphertext, so nothing breaks yet.
4. Backfill the existing rows:
   ```
   node scripts/backfill-encrypt-secrets.mjs --dry-run
   node scripts/backfill-encrypt-secrets.mjs
   ```

**Order matters.** Running step 4 before step 3 would leave the old code holding
ciphertext it cannot decrypt. Steps 1–3 are safe to do at any time.

## Credential rotation — not required for this change

The plaintext exposure was only reachable by a *member of the same
organization*. This platform has had no real-world users, so no one outside the
development team could ever have read these values, and the stored credentials
can be treated as uncompromised. No rotation is needed.

Rotate individual credentials later only if one of the normal triggers applies —
a secret ends up in a commit, a log, or a screenshot; a third-party provider
flags it; or someone leaves who had production access. At that point rotation is
per-provider: disconnect/re-authorize the OAuth integrations in Settings →
Integrations, rotate the Twilio auth token in the Twilio console, and regenerate
webhook / lead-endpoint secrets (coordinating with whoever calls them, since
both sides must be updated together).

## Rotating the master key later

There is no key-versioning scheme yet — `enc:v1:` identifies the format, not the
key. Rotating `SECRETS_ENCRYPTION_KEY` means decrypting every value with the old
key and re-encrypting with the new one in a single pass. If key rotation becomes
a routine requirement, add a key id to the prefix first.
