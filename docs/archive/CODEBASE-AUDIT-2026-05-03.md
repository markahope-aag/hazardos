# HazardOS Comprehensive Codebase Audit

**Date:** 2026-05-03  
**Scope:** Security, dependency health, static quality gates, CI, API/auth patterns, error handling, UX/accessibility touchpoints, testing & sustainability  
**Method:** Automated tooling (`npm audit`, `npm run type-check`, `npm run lint`), CI workflow review, targeted reads of high-risk routes (`webhooks`, `cron`, `v1`, `errors/report`), config (`next.config.mjs`), and spot-checks against the prior audit ([CODEBASE-AUDIT-2026-04-07](./CODEBASE-AUDIT-2026-04-07.md)).

---

## Executive scorecard

| Dimension | Grade | Evidence summary |
|-----------|-------|-------------------|
| **Static quality** | **A-** | `tsc --noEmit` and `eslint .` both **clean** on this snapshot. |
| **Security (app logic)** | **B** | Stripe webhook and cron auth show **fail-closed / timing-safe** patterns; v1 search uses **`sanitizeSearchQuery`**; `errors/report` is **rate-limited** + structured logging. Residual: CSP still allows **`unsafe-inline` / `unsafe-eval`** for scripts (Next/Stripe tradeoff). |
| **Security (dependencies)** | **B-** | `npm audit`: **12 moderate** (dompurify, postcss via next, uuid chain via sentry/exceljs/resend). No critical/high in this audit output; **`npm audit --audit-level=high`** is what CI runs — confirm it passes on `main`. |
| **Reliability** | **B** | Centralized API handler + `SecureError` / `throwDbError` in mature routes; some **`if (error) throw error`** remains on hot paths (see below). RLS and API tests exist under `test/`. |
| **Sustainability** | **B+** | **GitHub Actions CI** present (lint, typecheck, test, build, security job). Docs refreshed 2026-05-03; **`engines`: Node ≥20**. |
| **Test & coverage** | **C** | **422** test files, **5801** tests passing (snapshot 2026-05-03). **`npm run test:coverage`** currently **fails** global thresholds: lines **39.38%** (floor 40%), branches **29.63%** (31%), statements **37.39%** (38%), functions **35.42%** (38%) — close but not green; CI PR job uses **`--coverage.reporter=text-summary`** only and does **not** enforce the same floors unless aligned. |
| **UX / accessibility** | **B-** | **SkipLink** is rendered from **`app/(dashboard)/layout.tsx`** (prior audit “unused” is **out of date**). Large wizard/survey surfaces still warrant periodic **axe** / keyboard audits. |

---

## What improved since 2026-04-07 (verified)

| Prior finding | Current state |
|---------------|----------------|
| Stripe webhook secret empty / fail-open | **`STRIPE_WEBHOOK_SECRET`** missing → **500** “Webhook not configured”; signature verified with `constructEvent` ([`app/api/webhooks/stripe/route.ts`](../app/api/webhooks/stripe/route.ts)). |
| Cron `CRON_SECRET` not timing-safe | **`timingSafeEqual`** on `Bearer ${CRON_SECRET}`; **500** if secret unset ([`app/api/cron/appointment-reminders/route.ts`](../app/api/cron/appointment-reminders/route.ts)). |
| No CI | **`.github/workflows/ci.yml`** — lint, typecheck, tests (with coverage summary on PR), build, **`npm audit --audit-level=high`**, secret grep checks. |
| SkipLink unused | **`<SkipLink />`** in dashboard layout ([`app/(dashboard)/layout.tsx`](../app/(dashboard)/layout.tsx)). |
| v1 search injection | **Companies** GET uses **`sanitizeSearchQuery`** before `.or(...ilike...)` ([`app/api/v1/companies/route.ts`](../app/api/v1/companies/route.ts)). |

---

## Security — residual and watch items

1. **CSP** — `script-src` includes **`'unsafe-inline'`** and **`'unsafe-eval'`** in prod for Next/Stripe/Vercel ([`next.config.mjs`](../next.config.mjs)). Acceptable tradeoff for many Next apps; tightening would need **nonce/hash** strategy and regression testing.

2. **`npm audit` (moderate)** — dompurify, postcss (via Next), uuid (transitive). Track upstream Next/postcss fixes; run **`npm audit fix`** where non-breaking.

3. **`POST /api/errors/report`** — Unauthenticated by design; mitigated with **rate limiting** and validation of required fields. Risk remains **log volume / abuse**; monitor and cap payload size if needed ([`app/api/errors/report/route.ts`](../app/api/errors/report/route.ts)).

4. **Secrets** — CI greps for JWT-shaped strings and Resend keys in `app/`, `lib/`, `components/`. **No substitute** for secret scanning on PRs and **rotating** any key ever committed.

5. **Public API v1** — Uses API keys + org scoping; keep **rate limits** and **input sanitization** on every new list endpoint (pattern established on companies).

---

## Code quality & reliability

- **TypeScript + ESLint:** Both green — strong baseline for refactors and onboarding.
- **Raw Supabase throws:** Grep shows **`if (error) throw error`** in a **bounded set** of files (CRM pages, some API routes, survey actions, email service, etc.) — far smaller footprint than the “172” called out in April; still prefer **`throwDbError`** / **`createSecureErrorResponse`** on **new** code so clients never see raw PostgREST text.
- **Large client modules:** Work order detail, survey flows, and similar files are **high complexity** — acceptable for domain richness; mitigate with **tests** (page smoke + API) and **feature flags** where you ship risky changes.

---

## User experience & accessibility

- **Skip link:** Present on dashboard shell — good for keyboard users.
- **Email preview `srcDoc`:** Settings email page uses **`renderEmailHtml`** into an iframe — ensure template output stays **escaped/safe** for untrusted org input ([`app/(dashboard)/settings/email/page.tsx`](../app/(dashboard)/settings/email/page.tsx)).
- **Mobile survey / modals:** Prior audit called out **focus trap** and **`alert()`** usage; re-validate when touching those files; prefer **toasts** and **Radix dialogs** with correct **ARIA**.

---

## Testing & coverage

- **Volume:** 400+ `*.test.ts(x)` files; run `npm run test:run` for exact counts.
- **Coverage gate:** `vitest.config.ts` thresholds (**lines 40%, branches 31%,** etc.) — **`npm run test:coverage`** fails if below floor (instrumented globs only; not E2E).
- **CI vs local:** PR job runs **`npm run test -- --run --coverage`** with **text-summary** reporter — it does **not** currently mirror **`test:coverage`** threshold failure (local run: **~173s**, all tests green, then Vitest reported four **threshold** errors). Align CI with `test:coverage` if you want PRs blocked until coverage floors are met.

---

## Sustainability & operations

- **Node:** `package.json` **`engines.node >= 20`**; CI uses **Node 22** — good alignment.
- **Documentation:** Index and testing docs updated **2026-05-03** to reference **OpenAPI**, Vitest, and archived static coverage PDFs.
- **Technical debt:** Keep [TECHNICAL-DEBT.md](./TECHNICAL-DEBT.md) in sync when closing audit items.

---

## Prioritized recommendations (next 30–90 days)

| Priority | Action |
|----------|--------|
| **P0** | Confirm **CI** passes on `main` with **`npm audit --audit-level=high`** and full **test** + **build** matrix. |
| **P0** | Decide whether **PRs** must pass **`npm run test:coverage`** (thresholds) or only **summary** coverage — avoid silent drift. |
| **P1** | Schedule **dependency** upgrades addressing **postcss** / **dompurify** / **uuid** advisories when upstream permits. |
| **P1** | Replace remaining **`throw error`** on user-facing routes with **`throwDbError`** / secure envelopes where responses might leak schema. |
| **P2** | **E2E** (Playwright) for login → create job → invoice (or your top revenue path) — highest ROI for regressions UI tests miss. |
| **P2** | **Accessibility** pass (axe + keyboard) on **mobile survey wizard** and **work order detail** after major edits. |

---

## Appendix — commands run (2026-05-03)

```bash
npm audit          # 12 moderate; exit non-zero when vulnerabilities present
npm run type-check # pass
npm run lint       # pass
npm run test:coverage  # all tests pass; Vitest exits 1 — coverage below thresholds (see Testing section)
```

**Note:** This audit does **not** replace penetration testing, OWASP ZAP, or production monitoring (Sentry, Vercel logs). Re-run after major releases or security incidents.
