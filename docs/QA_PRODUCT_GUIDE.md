# HazardOS — Product Guide for QA

Read this before you start testing. It's the context you need to make
sensible decisions about what should and shouldn't happen.

## What HazardOS is

HazardOS is a **mobile-first SaaS platform for environmental
remediation companies** — the small-to-mid-size businesses that do
asbestos, mold, lead paint, and vermiculite abatement. It handles the
full business cycle in one place: lead capture, customer relationship
management, mobile site surveys, estimates, proposals with e-signature,
job scheduling and crew assignment, time/materials tracking, invoicing,
payments, customer feedback, and analytics.

The product positioning is **"the operating system for environmental
remediation companies"** — meaning it replaces the typical mix of
spreadsheets, paper forms in trucks, QuickBooks-only invoicing, and
disjointed CRM tools these companies use today.

The tone is **professional but not stuffy, technical but not
complicated, serious about safety but modern about delivery**. It's a
B2B tool — language should feel competent and credible, not
playful. If you see something that reads like a consumer app — flag
it.

## Who it's for

### Primary user: the field estimator

The estimator is the platform's main daily user. They:

- Drive to a customer's site (residential or commercial)
- Walk the property with their phone, capturing what's there
- Identify hazardous materials (asbestos in pipe insulation, lead paint,
  black mold, etc.)
- Take photos, often with GPS coordinates
- Build a structured site survey on their phone
- Generate an estimate from the survey
- Send the customer a proposal

A lot of this happens in **basements, attics, crawl spaces, vacant
buildings, and rural locations with no cell signal**. The mobile
survey flow is offline-first by design — drafts auto-save every 30
seconds to IndexedDB, photos queue locally with three retries, and
everything syncs when the device comes back online. Treat this as a
core promise: if a survey loses data when the network drops, that's
a critical bug.

### Secondary users (inside the company)

- **Office schedulers / admins** — take signed estimates and schedule
  the actual work, assign crews, monitor job time vs estimate.
- **Field technicians** — see assigned jobs, view scope, log time and
  materials on completion.
- **Business owners** — review pipeline, commission, analytics, decide
  pricing rules.
- **Tenant owner / admin** — manage team invites, billing, API keys,
  integrations.

### Secondary users (outside the company)

- **Customers** — receive proposals via a public portal
  (`/portal/proposal/[token]`), can view the PDF, sign electronically,
  and later receive invoices. Never sign in.
- **Customers post-job** — receive a feedback survey link
  (`/feedback/[token]`) for NPS scoring and testimonials.
- **Customers receiving SMS** — opt into messaging via
  `/public/sms-consent` (TCPA-compliant).

### Platform-level

- **Platform owner / platform admin** — cross-tenant administration
  for the HazardOS company itself (currently `mark.hope@asymmetric.pro`).
  Can see across all customer organizations. You won't have this role.

## The role hierarchy

HazardOS is **multi-tenant** — every customer company is a separate
organization, and almost all data is scoped by `organization_id` via
Postgres Row-Level Security. The role hierarchy (highest to lowest
permission):

```
platform_owner > platform_admin > tenant_owner > admin >
estimator > technician > viewer
```

Roles within a single organization:

- **tenant_owner** — created automatically on first signup, full
  access including billing
- **admin** — manage team, configure settings, full operational access
- **estimator** — create surveys, build estimates, send proposals
- **technician** — see assigned jobs, log time/materials on completion
- **viewer** — read-only

Multi-tenant isolation is a **critical** thing to test: a user in
Organization A should never be able to see or modify data in
Organization B. If you find a way to leak data across orgs — that's
the highest-severity bug in the platform.

## How customers pay

Three subscription tiers per organization (Stripe-billed):

| Tier | Price | What it includes |
|---|---|---|
| **Starter** | $99/mo | 1 user, basic estimates + quotes |
| **Professional** | $299/mo | 5 users, scheduling, pattern learning |
| **Enterprise** | $799/mo | Unlimited users, API access, white-label |

Pattern learning and the public API are gated to Professional+ and
Enterprise. Test that a Starter-tier user can't hit a feature their
plan doesn't include, and that the upgrade prompt is clear.

## Feature areas (use these as your testing groups)

### Authentication
Sign up at `/signup`, sign in at `/login`. New signups auto-create an
organization with the user as tenant_owner. Sessions are cookie-based
SSR. Sign-out must clear both server cookies and client localStorage.

### CRM Hub (`/crm` + sub-routes)
The customer relationship management heart of the app. Sub-tabs:
- `/crm/contacts` — individual people
- `/crm/companies` — commercial customers
- `/crm/opportunities` — qualified leads in the pipeline
- `/crm/pipeline` — kanban-style drag-and-drop pipeline
- `/crm/jobs` — won opportunities that became actual work
- `/crm/properties` — physical addresses where work happens

### Mobile site survey (`/site-surveys/mobile`)
The flagship field tool. Wizard flow: property details → access →
environment → hazards identified → photos → review. **Offline-first**
— drafts persist to IndexedDB and sync when online. Photos capture GPS
when available. Resume by visiting `/site-surveys/mobile?surveyId=xxx`.

### Estimates (`/estimates`)
Convert surveys to estimates. Hazard-specific line items with pricing
rules per material type and abatement method. Approval workflow before
sending to customer.

### Proposals (`/portal/proposal/[token]`)
PDF generation with e-signature. The customer-facing portal is
**unauthenticated** — anyone with the token URL can view and sign.
Templates exist for 8 hazard types. Once signed, a job is created.

### Jobs (`/crm/jobs`, `/jobs/[id]/complete`)
Scheduled remediation work with crew assignment. Crews log time,
materials, equipment, photos, and notes on completion. Variance
analysis compares actual vs estimated cost.

### Invoices (`/invoices`)
Generated from completed jobs. Delivered by email and/or SMS based on
customer preference. Payment status tracked. Automated reminders.

### Sales pipeline (`/crm/pipeline`)
Kanban board. Drag opportunities through stages. Track attribution
(first / last / converting touch).

### Commissions (`/sales/commissions`)
Automated calculation per sales user, approval workflow.

### Customer feedback (`/feedback/[token]`)
Post-job public portal. NPS survey + testimonial collection. Also
unauthenticated.

### Settings (`/settings/*`)
- Team (invites, role changes, removals)
- Billing (Stripe subscription management)
- Email + SMS preferences (Resend / Twilio configuration)
- API keys (for Enterprise tier external integrations)
- Pricing rules (per-org cost formulas)
- Integrations (QuickBooks etc.)

### Platform admin (`/(platform)/platform-admin/*`)
Multi-tenant management. You won't have access — skip in testing.

## Architecture at a glance

You don't need to read code, but knowing the shape helps you locate
issues:

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, Tailwind
  CSS 4, shadcn/ui components, Zustand for client state, TanStack
  Query for server state.
- **Auth**: Supabase Auth (cookie-based SSR sessions). Auth state via
  `useMultiTenantAuth()` hook.
- **Database**: Supabase Postgres with Row-Level Security. Every
  table org-scoped via `get_user_organization_id()` helper.
- **Hosting**: Vercel.
- **Monitoring**: Sentry.
- **Email**: Resend.
- **SMS**: Twilio (TCPA-compliant opt-in flow).
- **Payments**: Stripe (subscriptions), QuickBooks (invoice
  integration).
- **PWA**: Service worker via `@serwist/next`. Disabled in dev.
- **Mobile**: PWA installable on iOS / Android. NetworkFirst API
  caching (5 min), CacheFirst photos (30 days).

## Test environment / accounts

### Ready-made role accounts (Acme Remediation)

Each tester has a full set of role accounts pre-provisioned in the
**Acme Remediation** test org, so you can jump straight into
role-permission testing without running the signup/invite dance every
time. Each tester drives their **own** pool — so the two of you can test
concurrently without colliding on sessions or data. They use the
`+alias` trick: every alias lands in the tester's real inbox but
Supabase treats each as a separate account, so one person can also be
signed in as multiple roles across different browser sessions.

| Role | Roy (field tester) | Sophie (back-office tester) |
|---|---|---|
| Tenant Owner | `roy.tolosa+owner@asymmetric.pro` | `sophie.hope+owner@asymmetric.pro` |
| Admin | `roy.tolosa+admin@asymmetric.pro` | `sophie.hope+admin@asymmetric.pro` |
| Estimator | `roy.tolosa+estimator@asymmetric.pro` | `sophie.hope+estimator@asymmetric.pro` |
| Technician | `roy.tolosa+technician@asymmetric.pro` | `sophie.hope+technician@asymmetric.pro` |
| Viewer (read-only) | `roy.tolosa+viewer@asymmetric.pro` | `sophie.hope+viewer@asymmetric.pro` |

- **Shared password:** `HazardOS-QA-2026!` (emails are pre-confirmed —
  sign in immediately, no confirmation step).
- Roy's base account `roy.tolosa@asymmetric.pro` is also an **Admin** in
  the same org.
- The old `sophie.hope+tech@asymmetric.pro` alias is superseded by
  `+technician` (deactivated); use `+technician`.
- Need to reset passwords or add an alias? Re-run
  `scripts/qa-setup-tester-accounts.mjs` — it's idempotent and resets the
  shared password for both pools.

For **cross-tenant / isolation** testing you still need a second org:
sign up a fresh alias like `roy.tolosa+otherorg@asymmetric.pro` (NOT
invited to Acme) — it auto-creates its own org so you can confirm Acme's
data is invisible from it.

### Walking up the role hierarchy

- **Pre-provisioned roles**: just sign in with the alias above for the
  role you want to exercise.
- **Signup → tenant_owner** (feature under test): any alias not
  previously invited auto-creates a new org with you as owner.
- **Invited roles** (feature under test): from an owner/admin account,
  invite the next alias via `/settings/team` and pick the role, then
  accept from the email link in a different browser / incognito.
- **Tenant Owner note**: the in-app **invite** flow deliberately does
  not offer Tenant Owner — only Admin/Estimator/Technician/Viewer. A
  second owner is created by **promotion**: an existing owner opens
  `/settings/team` and changes a member's role to Tenant Owner. The org
  supports multiple owners (no single-owner constraint); the
  `+owner` alias above is one such pre-provisioned owner.
- **Cross-tenant test**: sign in to Acme in one browser and the fresh
  second-org alias in another — confirm Org A's data is completely
  invisible from Org B's session.

### Stripe billing

- Stripe test card `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002`
  declines. Expiration any future date, CVC any 3 digits.
- Upgrade from Starter → Professional → Enterprise should reflect in
  the dashboard within ~10 seconds of webhook delivery.

### Browser session tips

- One regular browser window for your tenant_owner.
- A private / incognito window for an invited role (estimator,
  technician).
- A third browser entirely (Firefox alongside Chrome) for the
  second-organization test.
- Mobile testing: install the PWA on your phone (Safari iOS / Chrome
  Android) to test the field survey experience honestly.

### What to ask Mark for

Only ask if you hit one of these:

- You need a test fixture (e.g., a fake organization with 100
  customers and 50 jobs for performance testing).
- You think you've found a cross-tenant data leak and want to confirm
  it before reporting it.
- You need platform_admin access to test cross-tenant admin tooling.

## Brand voice / tone

From the product overview:

- **Professional but not stuffy.** No corporate jargon, no
  consultant-speak.
- **Technical but not complicated.** The app handles hard problems —
  hazardous material identification, regulatory compliance, pricing
  for unfamiliar work — but the interface shouldn't make the user
  feel stupid.
- **Serious about safety, modern about delivery.** Hazardous
  remediation is real life-or-death work. The tone respects that
  while staying contemporary.

Customer-facing language (proposal portal, feedback survey, invoice
emails) should feel like the remediation company is talking to their
customer through HazardOS — not like HazardOS is talking to them. If
copy reads like a generic SaaS notification, flag it.

## Critical workflows (these MUST work)

These are the platform's value proposition. If any of these breaks,
that's a critical bug.

### 1. Estimate-to-job
1. Estimator opens a fresh survey on phone
2. Walks the property, captures everything
3. (Offline test) Survey survives going offline mid-walk-through
4. Survey saved, converted to an estimate
5. Estimate sent as a proposal to the customer
6. Customer opens the portal link, reviews PDF, signs electronically
7. Signed proposal auto-creates a job in the system
8. Scheduler sees new job in their queue

### 2. Job completion
1. Crew arrives on-site
2. Crew member opens the assigned job on their phone
3. Logs start time, materials used, photos of conditions found
4. Completes the job, submits
5. Office reviews variance vs estimate
6. Invoice auto-generated
7. Invoice sent to customer via email + SMS per their preference
8. Payment recorded
9. Job marked paid

### 3. Customer feedback
1. Job marked complete + paid
2. Feedback survey link sent to customer
3. Customer opens the unauthenticated portal
4. Submits NPS + testimonial
5. Score visible to office in analytics

### 4. Multi-tenant isolation
1. Two organizations: A and B
2. Each has customers, jobs, invoices
3. A user in Org A should see ONLY Org A's data
4. A user in Org B should see ONLY Org B's data
5. Even direct URL access to an Org B resource from an Org A session
   should 403 or 404

## What's NOT a bug (don't log these)

- The platform admin panel says "Unauthorized" when you visit it —
  that's correct, you're not platform_admin.
- The mobile survey shows "Offline — your changes will sync when
  you're back online" — that's by design.
- A customer link (proposal portal, feedback survey, SMS opt-in) works
  WITHOUT a login — those are intentionally public via token-based
  URLs.
- Photos taking a moment to appear after upload — they go through a
  background processing queue.
- API endpoints requiring an API key (issued at `/settings/api`) and
  returning 401 without one — that's correct.
- A new signup landing on Starter tier with limited features —
  upgrade path is expected.
- The dashboard for a new account being empty — there's no seed data.

## Known issues — don't log these as bugs

A comprehensive codebase audit was completed April 7, 2026
(`docs/CODEBASE-AUDIT-2026-04-07.md`). These are known and either
being worked on or scheduled. **Don't log them**:

### Security (known, being addressed)
- 23 npm dependency vulnerabilities flagged by `npm audit`
- Stripe webhook secret has an empty-string fallback in dev
- Cron secret comparison uses timing-unsafe `!==`
- `/api/errors/report` is unauthenticated and lacks a schema
- Rate limiting missing on public API v1 routes
- Debug pages (`/database-status`, `/migration-verification`) are
  accessible to any authenticated user
- Raw Supabase errors are sometimes thrown back to clients with
  table/column names visible (~172 instances)

### Auth (known)
- New signups get role `'owner'` in some paths instead of
  `'tenant_owner'` (the canonical role name) — UI doesn't crash but
  it's wrong

### Performance (known)
- `useMultiTenantAuth` hook fires 2–3 HTTP requests per mount, no
  cache. Used by 17+ components — visible as multiple network calls
  per page
- Notification bell polls 2 endpoints every 30 seconds
  unconditionally
- `select('*')` on wide tables in ~27 places

### Test coverage
- 42% statement coverage; auth, Stripe, survey store, and photo queue
  have 0% coverage

### Things that ARE fair to log
- Anything not on the audit lists above
- Anything visibly broken in user-facing flows
- Performance issues YOU experience as a tester (slow loads,
  flickering, double-loads)
- Anything that contradicts what this guide says HazardOS should do

## Where the rest of the docs live

- `/docs/HazardOS-PRD.md` — full product requirements document
- `/docs/HazardOS-Project-Overview.md` — strategic / positioning
- `/docs/FEATURES.md` — feature inventory
- `/docs/BUSINESS-LOGIC.md` — workflow specifications
- `/docs/CRM.md` — CRM-specific behavior
- `/docs/EMAIL-SMS-GUIDE.md` — communication system
- `/docs/CODEBASE-AUDIT-2026-04-07.md` — what's broken / scheduled
- `/docs/CHANGELOG.md` — release log
