# Architecture

Verified against the code on 2026-08-17. Every count here was measured, not
remembered. If a number looks wrong, re-measure rather than trust this file:
the commands are given so you can.

This replaces a 1,366-line architecture document that described the system as
it was imagined in April and mentioned none of what shipped after May.

## Shape

Next.js 16 App Router on Vercel, React 19, TypeScript in strict mode. Supabase
for Postgres, auth and storage. Tailwind 4 with shadcn/ui.

| Measure | Value | How to check |
|---|---|---|
| API routes | 259 | `Get-ChildItem app/api -Recurse -Filter route.ts` |
| Tables | 105 | `grep -c '^CREATE TABLE' supabase/migrations/00000000000000_baseline.sql` |
| Migrations | 31 | 3 baseline files plus everything since |
| Test files | 488 | `npm run test` |

## Multi-tenancy

Every business table carries `organization_id`. Isolation is enforced in
Postgres by row-level security, not in application code, so a raw client write
is subject to the same rules as a server one.

Policies read the caller's org through `get_user_organization_id()` and the
caller's role through `get_user_role()`. **Org scoping alone is not enough.**
Write policies name the roles that may write, because a viewer with the anon key
could otherwise write through PostgREST directly. That gap was real and was
closed in July and August.

Role hierarchy, defined in `lib/auth/roles.ts`:

```
platform_owner > platform_admin > tenant_owner > admin > estimator > technician > viewer
```

`ROLES.TENANT_READ`, `TENANT_WRITE`, `TENANT_ADMIN` and `TENANT_FIELD` are the
groupings actually used. Prefer them over hand-written role arrays so a change
lands in one place.

## Request path

`proxy.ts` at the repo root is the edge layer: session refresh, auth redirects,
CORS. **This is Next.js 16, so it is `proxy.ts` and never `middleware.ts`.**
Creating the latter causes 404s on every route.

API routes are wrapped by `createApiHandler` (`lib/utils/api-handler.ts`), which
takes `allowedRoles`, a Zod body schema and a query schema, and supplies
`context.supabase`, `context.profile`, `context.user` and `context.log`.

**Authorization is declarative on every mutating route**, and CI enforces it:

```bash
npm run check:route-guards   # fails on a new mutating route with no guard
npm run db:advisors          # fails on a new database advisor finding
```

Both use a ratchet. The route-guard baseline is empty, so there is nothing left
to burn down there. The advisor baseline holds 58 reviewed findings, each with a
written reason in `supabase/lints/advisor-exceptions.json`.

## Database

The schema is a **squashed baseline**, not a migration chain. Three
`00000000000000*` files rebuild an empty database and everything since builds on
top. The original 198-file chain could not rebuild from empty and lives in
`supabase/migrations-archive/` as read-only history.

Re-baselining is a trap worth reading `CLAUDE.md` about first: `supabase db dump`
covers the `public` schema only, so doing it naively drops the trigger that
creates a profile on signup, and every new user silently ends up with no
organization and no role.

Two conventions that cause real bugs when missed:

- **PostgREST needs an FK hint** when a table has several foreign keys to the
  same target: `customer:customers!customer_id(...)`, not `customer:customers(...)`.
- **`customers.name` is not computed.** Compose it from first and last on every
  write.

## Background work

Four Vercel crons:

| Path | Schedule | Does |
|---|---|---|
| `/api/cron/process-events` | every 10 min | Turns queued events into automation work |
| `/api/cron/appointment-reminders` | hourly | Sends due scheduled messages |
| `/api/cron/photo-lifecycle` | daily 07:00 | Retention and expiry on survey photos |
| `/api/cron/credential-expiry` | daily 08:00 | License and certification expiry alerts |

**Anything running from cron has no session**, so it must use the admin client.
Under the cookie client `get_user_organization_id()` is null, every org-scoped
policy matches zero rows, and the job reports success having done nothing. That
failure has already happened once here, with reminders, and is why
`reminder-sender.ts` carries a comment about it.

## Automations

The largest subsystem, documented separately in [`AUTOMATIONS.md`](./AUTOMATIONS.md).
In short: rules match an event, a chain of work items is created in one
transaction with computed due dates, and email and text steps queue real
messages rendered from tenant-authored templates.

## External services

| Service | Used for |
|---|---|
| Supabase | Postgres, auth, storage |
| Cloudflare R2 | Survey photos and originals |
| Resend | Outbound email, plus bounce webhooks |
| Twilio and RingCentral | SMS, two providers |
| Stripe | Subscription billing |
| QuickBooks | Invoice sync |
| Sentry | Error monitoring |

RingCentral sends and logs but **inbound and delivery status are not built**, so
STOP replies are not captured on that provider. That is a compliance matter at
volume.

## Testing

Vitest for unit, component and API tests. A separate integration suite runs
against a real Postgres, because mocked tests cannot see RLS policies at all.
Playwright E2E exists and is CI-wired.

```bash
npm run type-check
npm run lint
npm run test
npm run test:integration   # real Postgres, proves auth and RLS
```

## Things that will catch you

**`next dev` leaves artifacts that break `next build`.** A `prebuild` script
deletes `.next/dev` for this reason. A build failing inside `.next/` is stale
generated output, not your code.

**Production builds must use webpack** (`next build --webpack`) or no service
worker ships.

**`supabase start` does not re-apply migrations** to an existing volume. Use
`supabase db reset`.

**Auth cookies are chunked.** Match with `.includes('-auth-token')`, never
`.endsWith()`.
