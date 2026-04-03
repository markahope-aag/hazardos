# HazardOS — Project Context for Claude

## What is HazardOS?

HazardOS is a multi-tenant SaaS platform for environmental remediation companies. It manages the full lifecycle from lead generation through job completion and payment: CRM, site surveys, estimates, proposals, jobs, invoicing, and analytics.

The primary user persona is a small-to-mid-size hazardous materials abatement company (asbestos, lead, mold, vermiculite removal). Think 5-50 employees, doing residential and commercial work.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| UI | React 19, Tailwind CSS 4, shadcn/ui components |
| State | Zustand (client stores), TanStack Query (server state) |
| Forms | react-hook-form + Zod validation |
| Database | Supabase (PostgreSQL with Row-Level Security) |
| Auth | Supabase Auth (cookie-based SSR sessions) |
| Hosting | Vercel (Edge Network) |
| Monitoring | Sentry |
| Email | Resend |
| Payments | Stripe (billing), QuickBooks (invoicing) |
| PWA | @serwist/next (service worker, disabled in dev) |

## Critical Architecture Decisions

### Next.js 16: proxy.ts, NOT middleware.ts
This project uses `proxy.ts` at the root — the Next.js 16 replacement for middleware. **Never create a `middleware.ts` file** — it will conflict and cause 404s on all routes.

### Supabase Auth: Server + Client Split
- Server components use `lib/supabase/server.ts` (cookie-based)
- Client components use `lib/supabase/client.ts` (localStorage + cookies)
- The `proxy.ts` handles session refresh and auth redirects
- Auth cookies are chunked: `sb-xxx-auth-token.0`, `.1`, etc. — match with `.includes('-auth-token')`, not `.endsWith()`
- Signing out requires clearing both server cookies AND client localStorage

### Multi-Tenancy
Every table has `organization_id`. RLS policies use `get_user_organization_id()` helper function. All queries are org-scoped. Platform users (`is_platform_user = true`) can access cross-org data.

### Database Conventions
- Tables use `snake_case`
- UUIDs for all primary keys (`gen_random_uuid()`)
- `created_at` / `updated_at` timestamps with triggers
- RLS enabled on all tables
- FK hints required for PostgREST joins when a table has multiple FKs to the same target (e.g., `customers!customer_id`, `profiles!owner_id`)

## Project Structure

```
app/
  (auth)/                    # Auth pages (login, signup, forgot-password)
  (dashboard)/               # Authenticated app
    crm/                     # CRM hub (primary navigation)
      contacts/              # Contact list + detail
      companies/             # Company list + detail
      opportunities/         # Opportunity list + detail
      pipeline/              # Kanban board
      jobs/                  # Jobs list + detail
    page.tsx                 # Dashboard home
    calendar/                # Calendar view
    estimates/               # Estimate builder
    invoices/                # Invoice management
    jobs/                    # Legacy jobs route (also accessible outside CRM)
    settings/                # App settings (team, billing, API keys, etc.)
    site-surveys/            # Site survey management + mobile wizard
    layout.tsx               # Dashboard layout with main nav
  api/                       # API routes
    invitations/             # Team invitation endpoints
    v1/                      # Public API (API key auth)
      companies/             # Companies CRUD
      customers/             # Customers/contacts CRUD
  auth/callback/             # OAuth callback handler

components/
  customers/                 # Contact UI (list, detail, form, modals)
  companies/                 # Company UI (list)
  pipeline/                  # Kanban board components
  surveys/                   # Site survey wizard
  settings/                  # Settings components (team, invitations)
  auth/                      # Auth forms (login, signup, invite)
  pwa/                       # PWA install prompt
  ui/                        # shadcn/ui primitives
  providers/                 # React providers (query, analytics)
  layout/                    # Layout components (user menu)
  error-boundaries.tsx       # Error boundary components

lib/
  supabase/
    client.ts                # Browser Supabase client
    server.ts                # Server Supabase client (cookie-based)
    middleware.ts             # Session refresh for proxy.ts
    customers.ts             # CustomersService (CRUD)
    companies.ts             # CompaniesService (CRUD)
  services/
    pipeline-service.ts      # PipelineService (opportunities, stages)
    photo-upload-service.ts  # Photo queue processing
    activity-service.ts      # Activity logging
  hooks/
    use-customers.ts         # TanStack Query hooks for contacts
    use-companies.ts         # TanStack Query hooks for companies
    use-multi-tenant-auth.ts # Auth hook (user, profile, org)
    use-online-status.ts     # Online/offline detection
  stores/
    survey-store.ts          # Zustand store for mobile survey wizard
    photo-queue-store.ts     # Photo upload queue
  validations/
    customer.ts              # Zod schemas + form constants
  middleware/
    cors.ts                  # CORS handling
    unified-rate-limit.ts    # Rate limiting (Upstash Redis)
    api-key-auth.ts          # API key authentication
  utils/
    api-handler.ts           # createApiHandler wrapper (auth, validation, logging)
    secure-error-handler.ts  # SecureError class for safe error responses
    logger.ts                # Pino structured logging
    sanitize.ts              # Input sanitization

types/
  database.ts                # All DB types (auto-maintained, not generated)
  sales.ts                   # Opportunity, PipelineStage, etc.
  contacts.ts                # CustomerContact types

proxy.ts                     # Edge proxy (auth redirects, CORS, session refresh)
```

## CRM — The Primary Hub

The CRM is the first tab in the main navigation. When inside the CRM, the main nav is hidden and replaced by CRM sub-tabs (Contacts, Companies, Opportunities, Pipeline, Jobs). A "Main Menu" link returns to the standard nav.

### Data Model

```
Companies ←──→ Contacts (many contacts per company)
    │              │
    └──── Opportunities ────→ Jobs
              │
         Pipeline Stages (Kanban)
```

- **Contacts** (`customers` table) — people, classified as residential or commercial
- **Companies** (`companies` table) — business accounts, created through contact flow
- **Opportunities** (`opportunities` table) — sales pipeline items with hazard details
- **Jobs** (`jobs` table) — scheduled work, created from won opportunities
- **Pipeline Stages** (`pipeline_stages` table) — configurable Kanban columns

### Multi-Touch Attribution

Three attribution touchpoints on contacts, companies, opportunities, and jobs:
- `first_touch_source/medium/campaign` — how they found us
- `last_touch_source/medium/campaign` — what brought them back
- `converting_touch_source/medium/campaign` — what closed the deal

Source inheritance via DB triggers:
- Contact/Company → Opportunity (on create)
- Opportunity → Job (on create)

The `attribution_touchpoints` table logs every interaction for full-funnel analysis.

### Key Entity Fields

**Contacts:** first/last name, title, contact_type (residential/commercial), contact_role (decision_maker/billing/site_contact/etc.), mobile/office phone, preferred_contact_method, opted_into_email/sms, lead_source, follow-up tracking, account_owner_id

**Companies:** company_type (contractor/HOA/government/etc.), account_status (prospect/active/inactive/churned), billing/service addresses, lifetime_value, total_jobs_completed, payment_terms, quickbooks_customer_id

**Opportunities:** opportunity_status, hazard_types[], property_type, property_age, urgency (routine/urgent/emergency), regulatory_trigger, estimated_value/probability/weighted_value, assessment/estimate dates

**Jobs:** containment_level (OSHA Type I/II/III), permit_numbers[], disposal_manifest_numbers[], air_monitoring/clearance_testing flags, estimated/actual revenue & cost, gross_margin_pct, Ralph Wiggum Loop fields (estimate_variance_pct, variance_reason, job_complexity_rating, customer_satisfaction_score)

## Proposal Templates

8 standardized templates in `docs/proposal-templates/`:
- Encapsulation, Transite Siding, Lead Removal, Mold Remediation, Floor Tile, Miscellaneous Asbestos, TSI, Vermiculite
- Each has hazard-specific work practices and notes
- Shared sections: header, regulatory fees, standard notes, terms & conditions, signatures
- Uses `{{variable}}` placeholders for auto-fill

## API Patterns

### Internal API Routes
Use `createApiHandler` from `lib/utils/api-handler.ts`:
```typescript
export const GET = createApiHandler(
  { allowedRoles: ['admin', 'tenant_owner'], querySchema: myZodSchema },
  async (request, context, body, query) => {
    // context.supabase, context.profile, context.user, context.log
    return NextResponse.json({ data })
  }
)
```

### Public API Routes (`/api/v1/`)
Use API key authentication with scoped permissions.

### Role Hierarchy
`platform_owner` > `platform_admin` > `tenant_owner` > `admin` > `estimator` > `technician` > `viewer`

Always include `platform_owner` and `platform_admin` in `allowedRoles` for admin endpoints.

## Database Migrations

Located in `supabase/migrations/`. Push with:
```bash
npx supabase db push
```

Key migration series:
- `20260131*` — Initial schema (customers, site surveys, profiles, orgs)
- `20260201*` — Estimates, jobs, invoices
- `20260202*` — Customer contacts
- `20260220*` — Sales tools (pipeline, commissions, approvals)
- `20260403*` — CRM rebuild (companies, enhanced contacts/opportunities/jobs, multi-touch attribution)

## Testing & Building

```bash
npm run type-check    # TypeScript check
npm run lint          # ESLint
npm run build         # Production build
npm run dev           # Dev server (Turbopack)
npm run test          # Vitest
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://hazardos.app
RESEND_API_KEY=
RESEND_DOMAIN=hazardos.app
```

## Common Gotchas

1. **PostgREST ambiguous joins** — When a table has multiple FKs to the same target, use explicit hints: `customer:customers!customer_id(...)`, not `customer:customers(...)`
2. **Supabase auth cookies are chunked** — Match with `.includes('-auth-token')`, not `.endsWith('-auth-token')`
3. **proxy.ts redirects authenticated users away from /signup** — Exception carved out for invite tokens
4. **The `customers` table is conceptually "contacts"** — Named `customers` for historical reasons, displayed as "Contacts" in the UI
5. **Companies cannot exist without contacts** — No standalone company creation; companies are created through the commercial contact flow
6. **The `name` field on customers is computed** — Always set it from `first_name + ' ' + last_name` when creating/updating
7. **Payment status on jobs is derived** — No `payment_status` column; inferred from `status`, `deposit_received_date`, `final_invoice_date`, `final_payment_date`
8. **Pipeline stages are per-organization** — Default stages auto-created via trigger on org creation
