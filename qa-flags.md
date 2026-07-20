# QA Autopilot — Flags (2026-07-20)

## CRITICAL · No browser automation in session
Run phase (browser-driven UI passes) · Cannot drive the authenticated SPA; ~360 UI test cases remain Blocked. Fix: `claude mcp add playwright -- npx -y @playwright/mcp@latest` then reopen the session (`npx playwright install chromium` on first navigation).

## HIGH · v1 Public API — write surface is dead + a systemic race (scripted HTTP harness, service-confirmed)
Harness `.qa-harness/40-v1-api.mjs`, full writeup `.qa-harness/FINDINGS-v1-api.md`. 6 FAIL / 1 PASS / 1 BLOCKED. Headlines:
- **All 4 v1 POST create endpoints 500** (customers/estimates/invoices/jobs) — schema drift; routes insert columns the refactor renamed/removed + customers.name NOT NULL. The public-API write side is non-functional.
- **Entity-number race** (API20/HS10): `count()+1`, non-unique index → 8 concurrent creates all issued `EST-00011`. Shared by invoices & jobs.
- **`.or()` search injection** (API21/HS11): comma isn't sanitized; injected filter widened a 0-match search to 14/6 rows on customers/companies.
- **Collection `select('*')`** (API22): leaks 64 columns incl. qb/hubspot/mailchimp IDs, insurance PII, sms_opt_in_ip, lifetime_value.
- **No per-IP throttle** on estimates/invoices/jobs collections (API23).
- **DELETE returns 200 {success:true}** on unknown/cross-org id (API7) — isolation holds, response misleads.
- **API24 BLOCKED:** confirm `vercel env ls production` has UPSTASH_REDIS_REST_URL + TOKEN.

**Remediation is deploy-gated** (production client SaaS) and the jobs-route column mapping needs a product decision → NOT auto-fixed. See FINDINGS-v1-api.md §Remediation for the per-item plan. Awaiting go-ahead to implement on a branch + deploy.
