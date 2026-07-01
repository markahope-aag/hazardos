# HazardOS — Architecture & Domain Deep Dive

A technical companion to [OVERVIEW.md](./OVERVIEW.md). This document covers how
the system is structured, the data model, and the engineering that makes it work
in the field.

## High-level shape

HazardOS is a single Next.js 16 application (App Router) deployed on Vercel,
backed by Supabase for database, auth, and storage. It runs three faces of the
same product from one codebase:

1. **The web/PWA app** — the authenticated dashboard used by office staff and
   field techs, installable and offline-capable.
2. **The public API** (`/api/v1`) — a scoped, API-key-authenticated surface for
   customer integrations, documented with OpenAPI/Swagger.
3. **The customer portal** (`/portal`) — an unauthenticated surface where a
   remediation company's own clients review and approve proposals.

```
                 ┌─────────────────────────────────────────┐
                 │            proxy.ts (Edge)               │
                 │  session refresh · auth guards · CORS    │
                 └────────────────────┬────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
  App Router pages            /api internal routes           /api/v1 public
  (dashboard, portal)         createApiHandler()             API-key + scopes
        │                             │                             │
        └───────────────┬─────────────┴──────────────┬──────────────┘
                        ▼                            ▼
                 lib/services (domain logic)   lib/supabase (data access)
                        │                            │
                        └──────────────┬─────────────┘
                                       ▼
                       Supabase (PostgreSQL + RLS + Storage)
                                       │
                        Stripe · QuickBooks · Resend · Twilio ·
                        Google/Outlook Calendar · HubSpot · Mailchimp ·
                        Cloudflare R2 · Anthropic/OpenAI
```

## Critical architecture decisions

### `proxy.ts`, not `middleware.ts`
Next.js 16 replaces `middleware.ts` with a root `proxy.ts`. HazardOS uses the
new file. It runs at the edge on every request and handles:

- **Session refresh** — reads and rotates the Supabase auth cookies.
- **Auth guards** — unauthenticated users are redirected to `/login`;
  authenticated users are redirected away from auth pages.
- **Invite exception** — signup with an invite token is allowed through (and the
  existing session is cleared) so an invitee can register into an organization.
- **CORS** — preflight handling for the API surfaces.
- **Static passthrough** — assets, the PWA manifest, and the service worker are
  excluded from redirects.

> Creating a `middleware.ts` file will conflict and cause 404s on every route.

### Supabase auth: server + client split
- Server components/route handlers use `lib/supabase/server.ts` (cookie-based).
- Client components use `lib/supabase/client.ts` (localStorage + cookies).
- An `admin.ts` client bypasses RLS for privileged server-side operations.
- Auth cookies are **chunked** (`sb-...-auth-token.0`, `.1`, …), so code matches
  them with `.includes('-auth-token')`, never `.endsWith()`.
- Signing out must clear both server cookies **and** client localStorage.

### Internal API pattern: `createApiHandler`
Internal routes are wrapped by `createApiHandler` (`lib/utils/api-handler.ts`),
which centralizes auth, role checks, Zod validation, and structured logging:

```typescript
export const GET = createApiHandler(
  { allowedRoles: ['admin', 'tenant_owner'], querySchema: myZodSchema },
  async (request, context, body, query) => {
    // context.supabase, context.profile, context.user, context.log
    return NextResponse.json({ data })
  }
)
```

**Role hierarchy:**
`platform_owner` > `platform_admin` > `tenant_owner` > `admin` > `estimator` >
`technician` > `viewer`. Admin endpoints always include `platform_owner` and
`platform_admin` in `allowedRoles`.

## Multi-tenancy & security

Multi-tenancy is enforced at the **database layer**, not just in application
code — the strongest place to put it.

- **Every table carries `organization_id`.** RLS policies gate every read and
  write through a `get_user_organization_id()` helper, so a query can only ever
  see its own tenant's rows.
- **Platform users** (`is_platform_user = true`) can cross organization
  boundaries for support and administration.
- **Composite foreign-key integrity** ensures a child row's `organization_id`
  must match its parent's — a job can't reference another tenant's estimate.
- **Function hardening** — SECURITY DEFINER functions pin an explicit
  `search_path` and revoke anon/public grants, closing common Postgres privilege
  escalation vectors.
- **Materialized views** used for reporting are pre-filtered per organization so
  analytics stay both fast and tenant-safe.

Roughly 60+ of the 144 migrations exist solely to build, fix, and harden these
RLS policies — a signal of how central tenant isolation is to the product.

## The data model

The domain is one connected graph. Data inherits forward at each stage via
database triggers so information is entered once.

```
Companies ←──→ Contacts (customers)          many contacts per company
     │              │
     └──── Opportunities ────→ Jobs ────→ Work Orders ────→ Invoices
               │                 │
          Pipeline Stages   Time entries, crews, materials,
          (Kanban)          checklists, change orders, daily logs
```

### Key entities

- **Contacts** (`customers` table — named for historical reasons, shown as
  "Contacts" in the UI): people, classified residential/commercial, with a role
  (decision maker, billing, site contact), contact preferences, lead source, and
  follow-up tracking. The `name` field is computed from `first_name + last_name`.
- **Companies**: business accounts (contractor, HOA, government, …) with account
  status, billing/service addresses, lifetime value, payment terms, and a
  QuickBooks customer link. Companies can't exist standalone — they're created
  through the commercial contact flow.
- **Opportunities**: sales pipeline items carrying the hazard specifics —
  `hazard_types[]`, property type/age, urgency (routine/urgent/emergency),
  regulatory trigger, and estimated/weighted value.
- **Jobs**: scheduled work with the regulated-trade fields — `containment_level`
  (OSHA Type I/II/III), `permit_numbers[]`, `disposal_manifest_numbers[]`, air
  monitoring and clearance-testing flags, and estimated-vs-actual revenue/cost
  with a derived gross margin.
- **Site Surveys**: field assessments (renamed from "assessments") with hazard
  details, measurements, site conditions, photos, and versioning.
- **Estimates / Line Items / Proposals / Invoices / Work Orders / Lab Reports**:
  the document and billing chain, each versioned and org-scoped.

### Domain conventions worth knowing

- **PostgREST FK hints are required** when a table has multiple foreign keys to
  the same target: `customer:customers!customer_id(...)`, not
  `customer:customers(...)`.
- **Pipeline stages are per-organization**, auto-created by a trigger when an
  org is created.
- **Payment status on jobs is derived**, not stored — inferred from `status`,
  `deposit_received_date`, `final_invoice_date`, and `final_payment_date`.

## Multi-touch attribution

A differentiator most trade software doesn't attempt: closed-loop, full-funnel
marketing attribution.

- Contacts, companies, opportunities, and jobs each store three touchpoints —
  **first-touch**, **last-touch**, and **converting-touch** — as
  source/medium/campaign triples.
- Source data **inherits down the funnel via DB triggers**: contact/company →
  opportunity on create, opportunity → job on create.
- The `attribution_touchpoints` table logs every interaction, enabling
  full-funnel ROI analysis — tracing realized job revenue back to the campaign
  that originated the lead.

## Field-first engineering

The app is designed to work where remediation actually happens: basements,
attics, and job sites with poor connectivity.

### PWA & offline
- A Serwist service worker (`app/sw.ts`) with **versioned cache invalidation** —
  bumping `SW_VERSION` forces every client to refresh.
- **Granular runtime caching strategies** tuned per resource type: Supabase API
  (NetworkFirst, short TTL), photos/storage (CacheFirst, long TTL), fonts and
  static assets (StaleWhileRevalidate), with an `/offline` fallback page.
- The survey wizard persists to **IndexedDB** and syncs on reconnect, so a full
  survey can be completed with zero signal.
- App shortcuts (New Site Survey, Jobs) make the installed PWA feel native.

### Photo upload pipeline
Photos are the heaviest and most failure-prone field data, so the pipeline
(`photo-upload-service.ts`) is purpose-built:

- **Queued uploads** with bounded concurrency (max 2 at a time).
- **Exponential-backoff retries** (2s → 4s → 8s) to ride out flaky connections.
- **Dual storage**: an `r2:` key prefix routes to Cloudflare R2; legacy paths
  fall back to Supabase Storage.
- **Direct base64 parsing** for data-URL images to avoid exhausting the
  browser's connection pool on large captures.
- **Signed URLs** with an 8-hour TTL for mobile caching.
- Photos can be run through **AI analysis** and stamped with metadata
  watermarks for compliance documentation.

### The survey wizard
`components/surveys/mobile/` is a multi-step form built from 35+ components that
branches by hazard type — asbestos (material, friability, location, quantity),
lead (component type, child presence), mold (area, moisture source, scope),
vermiculite (attic loose-fill) — using radio-card groups, yes/no toggles,
numeric steppers, and voice-note capture, all offline-first.

## Public API & rate limiting

The `/api/v1` surface lets customers integrate programmatically:

- **API keys** are stored hashed with a display prefix, carry scopes
  (read/write/admin), and support expiration.
- **Atomic rate limiting** is done in PostgreSQL via a
  `check_and_increment_rate_limit()` function using `FOR UPDATE` row locking
  over a sliding window — closing the time-of-check/time-of-use race that naive
  read-then-write limiters suffer. An Upstash Redis limiter is also available
  for edge-level throttling.
- The surface is documented with OpenAPI and browsable via Swagger UI.

## AI features

AI augments the field-to-office workflow rather than replacing it:

- **Estimate drafting** — generate a first-pass itemized estimate directly from
  survey data.
- **Photo analysis** — assist hazard identification from captured site photos.
- **Voice transcription** — turn field voice notes into structured text.

Both Anthropic and OpenAI SDKs are wired in, with AI consent and PII-protection
handled at the database layer.

## Integrations

| Integration | Purpose |
|-------------|---------|
| **Stripe** | Subscription billing and invoice payments |
| **QuickBooks** | Accounting / invoice sync |
| **Resend** | Transactional and delivery email |
| **Twilio** | SMS delivery and inbound handling |
| **Google Calendar / Outlook** | Two-way job and reminder scheduling sync |
| **HubSpot / Mailchimp** | CRM and marketing sync |
| **Cloudflare R2** | Primary photo/object storage |
| **Inbound lead webhooks** | Ingest leads from external vendors |

Integration credentials live in `organization_integrations`, scoped per tenant.

## Repository map

```
app/
  (auth)/        login, signup, forgot/reset password
  (dashboard)/   the authenticated app — crm, estimates, invoices, jobs,
                 work-orders, site-surveys, calendar, reports, settings, platform
  (public)/      feedback, offline, sms-consent
  portal/        customer-facing proposal review
  api/           ~210 route files (internal + /api/v1 public)
  sw.ts          Serwist service worker

components/      feature-organized UI (surveys, estimates, jobs, pipeline,
                 invoices, photos, billing, reports, ui primitives, …)

lib/
  supabase/      client / server / admin clients + per-entity data access
  services/      domain logic (estimates, jobs, invoices, photos, CRM,
                 integrations, notifications, analytics, api-keys)
  hooks/         TanStack Query hooks + auth/online-status hooks
  stores/        Zustand stores (survey wizard, photo queue)
  validations/   Zod schemas
  middleware/    CORS, rate limiting, API-key auth
  utils/         createApiHandler, secure error handling, logging, sanitize

supabase/migrations/   144 migrations (schema + RLS + hardening + perf)
docs/                  PRD, business logic, API reference, proposal templates,
                       audits, migration guides
proxy.ts               edge auth/session/CORS
```

## Build & test

```bash
npm run dev          # Turbopack dev server
npm run type-check   # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest
npm run build        # production build
npx supabase db push # apply migrations
```
