# HazardOS Comprehensive Codebase Audit

**Date:** 2026-04-07
**Scope:** Full codebase — security, code quality, performance, UX/accessibility, test coverage, sustainability

---

## Scorecard

| Dimension | Grade | Summary |
|-----------|-------|---------|
| **Security** | C | 3 critical, 6 high — webhook secrets, PostgREST injection, CSP gaps |
| **Code Quality** | B | Solid architecture, but 172 raw DB error throws, oversized files, N+1 queries |
| **Performance** | B- | Good code-splitting, but auth hook fires 2-3 requests per mount, notification polling |
| **UX / Accessibility** | B- | Good primitives, but custom modal lacks focus trapping, `alert()` in surveys, no skip link |
| **Test Coverage** | D | 42% statements (target: 70%), 0% on auth infra, stripe, survey store |
| **Sustainability** | C+ | No CI/CD, 23 npm vulns, manual DB types, no pre-commit hooks |

---

## CRITICAL — Fix Before Any Deploy

| # | Area | Issue | Location |
|---|------|-------|----------|
| 1 | Security | **Rotate all secrets** — service role key + Resend key in `.env.local`, verify git history is clean | `.env.local` |
| 2 | Security | **Stripe webhook secret falls back to `''`** — fail-open on misconfigured deploy | `app/api/webhooks/stripe/route.ts:30` |
| 3 | Security | **Cron secret uses `!==` (not timing-safe)** and `"Bearer undefined"` bypass when unset | `app/api/cron/appointment-reminders/route.ts:32` |
| 4 | Code Quality | **172 raw Supabase errors thrown** — `if (error) throw error` leaks table names, constraints, schema to clients | All service files |
| 5 | Sustainability | **No CI/CD pipeline** — no GitHub Actions, no automated checks on PRs | Missing `.github/workflows/` |
| 6 | Sustainability | **Rate limiting missing on all public API v1 routes** — abuse vector | `app/api/v1/*` |

---

## HIGH — Fix This Sprint

### Security

| # | Issue | Location |
|---|-------|----------|
| 7 | Unsanitized search in PostgREST `.or()` — LIKE injection in v1 API | `app/api/v1/companies/route.ts:42`, `customers/route.ts:50` |
| 8 | `/api/errors/report` — no auth, no schema, log injection risk | `app/api/errors/report/route.ts` |
| 9 | Phantom `'owner'` role — onboarding sets `role: 'owner'` but hierarchy expects `'tenant_owner'` | `app/api/onboard/complete/route.ts:68` |
| 10 | Production CSP has `'unsafe-inline'` + `'unsafe-eval'` for scripts | `next.config.mjs:123-125` |
| 11 | Rate limit key uses spoofable `x-forwarded-for` | `lib/middleware/memory-rate-limit.ts:42` |
| 12 | Tenant `admin` can access platform query metrics | `app/api/admin/query-metrics/route.ts:17` |

### Code Quality

| # | Issue | Location |
|---|-------|----------|
| 13 | N+1 query — `segmentation-service.ts` issues 1-4 DB calls per customer in a loop | `lib/services/segmentation-service.ts:376-424` |
| 14 | DELETE operations never check `response.ok` — show success toast on failure | `app/(dashboard)/settings/pricing/page.tsx:189-359` |
| 15 | Stub PDF/invoice buttons visible to users but no-op on click | `components/invoices/invoice-pdf-generator.tsx`, `components/reports/report-pdf-exporter.tsx` |
| 16 | Debug pages accessible to any authenticated user | `db-test/`, `database-status/`, `migration-verification/`, `env-check` |

### Performance

| # | Issue | Location |
|---|-------|----------|
| 17 | `useMultiTenantAuth` fires 2-3 HTTP requests per component mount, no shared cache, 17+ consumers | `lib/hooks/use-multi-tenant-auth.ts` |
| 18 | Notification bell polls 2 endpoints every 30s unconditionally, all tabs | `components/notifications/notification-bell.tsx:118` |
| 19 | `select('*')` on wide tables (27 occurrences across 17 files) | `lib/supabase/companies.ts`, `customers.ts`, `survey-store.ts`, etc. |

### UX / Accessibility

| # | Issue | Location |
|---|-------|----------|
| 20 | Custom exit modal in survey wizard — no focus trap, no Escape, no ARIA | `components/surveys/mobile/mobile-survey-wizard.tsx:690-731` |
| 21 | `alert()` for validation errors (12 calls) instead of toast | `components/surveys/mobile/sections/property-section.tsx`, `review-section.tsx` |
| 22 | `SkipLink` component exists but is never rendered | `components/ui/skip-link.tsx` — unused |
| 23 | No `beforeunload` handler on any form | Codebase-wide |

### Test Coverage

| # | Issue | Impact |
|---|-------|--------|
| 24 | 42% statement coverage (target 70%) | Below threshold |
| 25 | 0% coverage: auth infra, stripe service, survey store, photo queue | Critical paths untested |
| 26 | 17 services have zero test files | Including pipeline, platform-admin, segmentation |
| 27 | No E2E tests (Playwright) | Zero end-to-end coverage |

### Sustainability

| # | Issue | Location |
|---|-------|----------|
| 28 | 23 npm vulnerabilities (1 critical in jspdf, 13 high) | `npm audit` |
| 29 | `types/database.ts` manually maintained (1,427 lines) — schema drift risk | `types/database.ts` |
| 30 | No pre-commit hooks enforcing checks | No Husky/lint-staged |
| 31 | No runtime env validation — missing vars silently produce `undefined` | Codebase-wide |
| 32 | `.env.example` incomplete — missing most service keys | `.env.example` |

---

## MEDIUM — Plan for Next Sprint

### Security

- OAuth callbacks reflect unencoded errors in redirects (`app/api/integrations/*/callback/route.ts`)
- SMS opt-in endpoint has no Zod schema (`app/api/sms/opt-in/route.ts`)
- Accidental `nul` file committed to repo root

### Code Quality

- Repeated auth+profile lookup in 80+ service methods (DRY violation) — pass `organizationId`/`userId` from handler context
- 5 files exceed 800 lines: `settings/pricing/page.tsx` (1,040), `job-completion-service.ts` (970), `jobs/[id]/complete/page.tsx` (958), `openapi-spec.ts` (4,780), `types/database.ts` (1,427)
- `api-handler.ts` duplicates handler scaffold 3x — extract shared `runHandler`
- `VarianceSummary` in job-completion-service uses direct mutation inside `forEach` — use `reduce`
- Sequential `await` in loops for SMS keyword processing and notification fan-out — use `Promise.all`

### Performance

- Site surveys page applies search filter client-side after loading all results (`app/(dashboard)/site-surveys/page.tsx:128`)
- Upload status and offline sync poll Zustand via `setInterval` instead of `subscribe` (`lib/hooks/use-online-status.ts:95`, `use-offline-sync.ts:166`)
- `login_count` incremented on every auth state change, not just `SIGNED_IN` events (`lib/hooks/use-multi-tenant-auth.ts:73`)
- `swagger-ui-react/swagger-ui.css` eagerly loaded in page bundle (`app/(dashboard)/api-docs/page.tsx:4`)
- `PipelineService.createOpportunity` makes 4 sequential DB round trips (`lib/services/pipeline-service.ts:157-165`)

### UX / Accessibility

- Mixed hardcoded grays (137 occurrences) and design tokens (410) — dark mode will break
- No `autoComplete` attributes on auth forms (login, signup)
- Customer list table not responsive on mobile
- No breadcrumbs on detail pages (`/crm/contacts/[id]`, `/site-surveys/[id]`)
- Nav elements missing `aria-label` and `aria-current="page"`
- Select/RadioCardGroup form controls not associated with Label elements in customer-form and property-section
- Chart colors hardcoded per component instead of centralized tokens
- Submit button in survey wizard uses inline `bg-green-600` instead of a Button variant

### Sustainability

- Redundant PDF libs (`jspdf` + `@react-pdf/renderer`) — consolidate to one
- 59 migrations with fix-on-fix patterns — needs squash
- 49 outdated packages (multiple major versions behind: Stripe 22, lucide-react 1.x, TypeScript 6)
- `happy-dom` in devDeps but unused (vitest uses jsdom)
- `dotenv` and `glob` may not be needed in production deps
- `@types/swagger-ui-react` in production deps instead of devDeps
- Point-in-time status docs in `docs/` becoming stale — consolidate or archive

---

## LOW — Nice to Have

- Memory rate limiter state lost on serverless cold starts — document Redis requirement
- `console.warn` in auth hook leaks internals to browser DevTools
- `.gitignore` doesn't cover `.env.production` / `.env.staging`
- PWA install button height `min-h-[36px]` below 44px WCAG target
- Error message styling in `customer-form.tsx` uses `text-red-600` instead of `text-destructive`
- TODOs without ticket references (invoice PDF, report PDF export)
- Logo alt text could be more descriptive than "HazardOS"
- "Main Menu" link label navigates to Dashboard, potentially misleading

---

## What's Working Well

- **Architecture** — `createApiHandler` wrapper, `SecureError` system, structured Pino logging, Zustand + TanStack Query separation
- **Multi-tenancy** — RLS policies with `get_user_organization_id()`, org-scoped queries throughout
- **Input validation** — Zod schemas on all internal API routes, comprehensive `sanitize.ts` with SQL LIKE escaping, CSV formula injection prevention, HTML entity encoding
- **Code splitting** — recharts, PDF, AI SDKs, Kanban all properly lazy-loaded via `dynamic()` with `optimizePackageImports`
- **Mobile survey** — offline support with IndexedDB, photo queue with retry, touch targets 44-52px, safe area handling, swipe navigation
- **Documentation** — CLAUDE.md is exceptional, OpenAPI spec with Swagger UI, 46 docs files
- **Security headers** — HSTS with preload, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restrictive
- **Webhook verification** — `lead-webhook-service.ts` correctly uses `timingSafeEqual` for HMAC
- **Feature flags** — DB-backed with org-scoping, usage tracking, billing tier integration
- **Error handling** — `SecureError` class with typed error responses, `createSecureErrorResponse` catches common DB errors
- **Rate limiting** — Dual strategy (Redis + memory fallback), per-route tier configuration
- **CORS** — Policy-based with separate configs for public API, webhooks, internal, and OpenAPI routes
- **State management** — Clean TanStack Query hooks with proper staleTime, Zustand stores with persistence, no redundant server state duplication
- **Test infrastructure** — 5,781 tests passing, good test helpers and mock data factories, comprehensive validation test coverage (99.58%)

---

## Coverage Report Summary

| Directory | Statements | Branches | Functions | Lines | Status |
|-----------|-----------|----------|-----------|-------|--------|
| `lib/validations` | 99.58% | 92.30% | 100% | 99.58% | OK |
| `lib/config` | 94.44% | 84.61% | 100% | 94.23% | OK |
| `components/layout` | 93.33% | 100% | 85.71% | 93.33% | OK |
| `components/sales` | 93.93% | 93.75% | 100% | 96.77% | OK |
| `lib/utils` | 88.52% | 81.81% | 91.93% | 88.91% | OK |
| `components/ui` | 76.81% | 56.93% | 69.81% | 78.08% | OK |
| `lib/middleware` | 59.00% | 56.25% | 32.25% | 62.09% | MEDIUM |
| `lib/hooks` | 53.64% | 43.03% | 55.07% | 54.06% | MEDIUM |
| `components/auth` | 45.71% | 46.34% | 35.71% | 49.68% | HIGH |
| `lib/services` | 40.51% | 36.49% | 53.56% | 43.78% | HIGH |
| `app/(dashboard)` | 31.03% | 8.88% | 30.00% | 31.03% | HIGH |
| `lib/supabase` | 13.71% | 14.83% | 27.27% | 13.71% | CRITICAL |
| `lib/stores` | 10.71% | 25.89% | 4.13% | 12.55% | CRITICAL |
| **Overall** | **42.45%** | **36.09%** | **42.32%** | **44.33%** | **BELOW TARGET** |

### Zero Coverage (Critical Paths)

- `lib/supabase/server.ts` — server-side auth client
- `lib/supabase/middleware.ts` — session refresh
- `lib/supabase/client.ts` — browser auth client
- `lib/stores/survey-store.ts` — 649 lines, core mobile survey state
- `lib/stores/photo-queue-store.ts` — photo upload queue
- `lib/services/stripe-service.ts` — payment processing (~570 lines)
- `app/auth/callback` — OAuth callback handler
- All CRM detail pages, chart components, PDF generation, PWA components
