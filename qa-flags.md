# QA Autopilot — Flags (2026-07-20)

## CRITICAL · No browser automation in session
Run phase (browser-driven UI passes) · Cannot drive the authenticated SPA; ~360 UI test cases remain Blocked. Fix: `claude mcp add playwright -- npx -y @playwright/mcp@latest` then reopen the session (`npx playwright install chromium` on first navigation).

## RESOLVED (verified 2026-08-04) · v1 Public API findings from 2026-07-20
Every HIGH item below was re-tested on 2026-08-04 by the ported suite in
`tests/integration/`, which runs in CI on every PR. All of them now pass. The
original writeup is preserved at `docs/qa/FINDINGS-v1-api.md`; the `.qa-harness`
scripts that produced it have been retired.

| 2026-07-20 finding | Status | Covering test |
|---|---|---|
| All 4 v1 POST create endpoints 500 | **fixed** — all return 201 | `api-v1-write.test.ts` |
| Entity-number race (API20/HS10) | **fixed** — 8 concurrent creates, all distinct | `api-v1-write.test.ts` |
| `.or()` search injection (API21/HS11) | **fixed** — comma neutralised | `api-v1-behaviour.test.ts` |
| Collection `select('*')` leak (API22) | **fixed** — no internal/integration columns | `api-v1-behaviour.test.ts` |
| No per-IP throttle on estimates (API23) | **fixed** — burst is throttled | `zz-api-v1-throttle.test.ts` |
| DELETE 200 on unknown/cross-org id (API7) | **fixed** — returns 404, isolation holds | `api-v1-behaviour.test.ts` |
| API24 Upstash configured | still environmental | not portable — check `vercel env ls production` |

Because these are covered continuously now, a regression fails CI rather than
waiting for someone to remember to run a script.

## Fresh full run, 2026-08-15

- **HIGH · Technicians could read all estimate and invoice money · `app/api/{invoices,estimates}/**`, `app/(dashboard)/{invoices,estimates,sales}` · FIXED in `10ccb77`.**
  `ROLES.FINANCIAL_VIEW` existed but was referenced nowhere in the codebase. The
  2026-07-28 client requirement (field crew must not see job value) was only ever
  implemented as nav hiding, so a technician who typed the URL got the page and the
  list APIs returned real totals: 7 estimates including $5,335.20 and $3,866.33, plus
  3 invoices. The two detail GETs had no `allowedRoles` key at all, so they fell back
  to any authenticated user. Fix guards all five endpoints with `FINANCIAL_VIEW` and
  adds route layouts. Verified both directions: technician now 403 and redirected,
  estimator and viewer unchanged at 200 with data.

- **MEDIUM · Approvals page rendered for technicians · `app/(dashboard)/time-clock/approvals` · FIXED in `30b66af`.**
  No data was exposed (the API was already guarded by `TENANT_WRITE`) but the page
  opened as an empty shell instead of redirecting. Now redirects to `/time-clock`.

- **LOW · Viewer role has a nav and permission mismatch · main dashboard nav · NOT FIXED, needs a product decision.**
  `FINANCIAL_VIEW` deliberately includes `viewer` ("office read-only staff still need
  it for billing questions"), and a viewer can indeed open `/invoices` and read it.
  But the nav does not show Invoices, Estimates, or Sales to a viewer, so the access
  they are meant to have is only reachable by typing the URL. Either the nav should
  show these to viewers or the role comment is wrong. Leaving as-is rather than
  guessing which side is correct.

- **HIGH · Technicians could create and approve job change orders, leaving job money inconsistent · `app/api/jobs/[id]/change-orders/route.ts` · FIXED in `7912b92`.**
  Neither POST nor PATCH set `allowedRoles`. Verified against production: a technician
  created a change order (201) and approved it (200). The approve path then calls
  `recomputeJobTotals`, whose write to `jobs` RLS refuses for a technician, so the
  change order reached `approved` while `change_order_amount` and `final_amount` stayed
  at their old values. The result is an approved change order that never reaches the
  job total, and it fails silently. Now gated by `TENANT_WRITE`. Verified both ways:
  technician PATCH returns 403, admin create/approve/credit still computes correctly
  (10660 to 11160 to 10960).

- **MEDIUM · Job materials endpoints have no role guard · `app/api/jobs/[id]/{materials,material-usage}/route.ts` · NOT FIXED, needs a product decision.**
  Same missing `allowedRoles` pattern as the change orders above. I did not gate these
  because recording materials used is plausibly field work a technician should do, but
  the records carry `unit_cost`, which is money the field crew is not supposed to see.
  Decide whether technicians record materials with cost, record them without cost, or
  not at all, then gate to `TENANT_FIELD` or `TENANT_WRITE` accordingly.

- **HIGH · Quick Add Appointment silently created nothing · `app/(dashboard)/site-surveys/quick-create-appointment-modal.tsx` · FIXED in `f380ad6`.**
  The modal inserted `created_by` into `site_surveys`, which has no such column, so
  every submission failed with `PGRST204` and no appointment was ever created. This is
  one of the fixes promised in response to the 2026-07-28 client feedback, and it had
  never worked in production. The form validated and the button responded, so nothing
  about the UI suggested a failure. Found by reading the failing POST off the wire
  rather than trusting the screen. Retested after deploy: the survey row is created.

- **NOTE · Harness incident: a seeded activity type was deleted from production and restored · `activity_types` · RESOLVED, no data lost.**
  While building the NF27 delete-refusal test, the harness created its blocking
  fixture through the API, the fixture creation failed, and the DELETE that followed
  was therefore correctly allowed. It removed the seeded "Initial contact" activity
  type from the AHS org. Nothing referenced it (the very reason the delete was
  permitted), so there were no dependent rows. It was restored within minutes with the
  canonical seed values (kind `call`, sort_order 1, is_system true) read from other
  organizations, and the org is back to 12 types. The harness was then rewritten to
  build its fixture with the service role, to confirm the reference exists before
  issuing any delete, and to point the delete at a throwaway type instead of a seeded
  one. Recorded here because it was a real write to production data.

- **LOW · CRM job page tab strip is not exposed to assistive technology · `app/(dashboard)/crm/jobs/[id]/page.tsx` · NOT FIXED, small accessibility gap.**
  The Overview / Financials / Documents / Activity strip is built from plain `button`
  elements with no `role="tab"`, `aria-selected`, or `tablist` wrapper, so a screen
  reader announces four unrelated buttons rather than a tab set. The functionality is
  correct and the Financials tab renders Change Orders and Materials as intended. Worth
  folding into the accessibility workstream rather than patching in isolation; noticed
  because a `role="tab"` selector found nothing here while it works on the jobs page.

- **LOW · QuickBooks connect hands back an unusable OAuth URL instead of an error · `app/api/integrations/quickbooks/connect/route.ts` · NOT FIXED.**
  With no QuickBooks credentials configured, the endpoint still returns 200 and a URL
  reading `client_id=&response_type=code...`. A user who clicks Connect is sent to
  Intuit and gets an opaque failure there rather than a clear "QuickBooks is not
  configured" message here. Worth a guard that returns a 400 when the client id is
  empty, so the failure is legible at the point of use.

- **INFO · Stripe and QuickBooks are not configured in production · environment · Not a code defect.**
  Confirmed by probing: checkout returns `STRIPE_SECRET_KEY environment variable is not
  set`, and the QuickBooks client id is empty. All three billing/integration routes are
  correctly wired, authenticated and validated, so these are credential gaps rather than
  broken code. The three AI tests could not be pushed past the rate limiter, so the
  state of ANTHROPIC_API_KEY in production remains unconfirmed.

## Supabase database linter, 2026-08-16

The linter reported 3 ERRORs and roughly 60 WARNs. Probing each one narrowed
that to five real problems; the rest are either unreachable or intentional.

- **HIGH · Reporting views exposed money to technicians · `v_job_costs`, `v_sales_performance`, `v_lead_source_roi` · FIXED in `7d83536`.**
  Flagged as SECURITY DEFINER views. They wrap materialized views, which cannot
  carry RLS, so each does its scoping by hand in a WHERE clause that checked
  organization and nothing else. A technician selecting from `v_job_costs` and
  `v_lead_source_roi` got rows back, walking around the FINANCIAL_VIEW gate added
  the day before. Added the role predicate. Technician now reads 0 rows; viewer
  and admin unchanged.

- **HIGH · Four RPCs executable by anyone, signed in or not · FIXED in `afd52f7` and `b1155d9`.**
  `refresh_report_views` (forced MV refreshes on demand), `reset_query_performance_stats`
  (wiped monitoring history), `create_default_message_templates(org_id)` and
  `generate_lab_report_number(org_id)` (both take the org as a parameter, so the
  caller picks the target). The anon key ships in the browser, so this was open to
  anyone. Note the first revoke silently did nothing: Postgres grants EXECUTE to
  PUBLIC by default, so revoking from anon and authenticated left PUBLIC holding it.

- **INFO · The baseline squash appears to have dropped grant state.**
  `reporting-service.ts` carries a comment saying `refresh_report_views` is "locked
  to service_role per the security lockdown migration". It was not. Grants and
  revokes are easy to lose in a schema dump, so other lockdowns from before the
  2026-08-03 baseline should be treated as unverified until probed.

- **NOT A DEFECT · ~16 trigger functions listed as RPC-callable.**
  `update_*_stats`, `queue_*_event`, `guard_*_delete` and the `create_default_*`
  trigger wrappers return `trigger`, and PostgREST refuses them with PGRST202.
  Not reachable, so not worth churning.

- **BY DESIGN · Customer portal and RLS helper functions.**
  `get_proposal_by_token`, `sign_proposal_by_token`, `record_proposal_view`,
  `get_invoice_for_portal`, `get_feedback_survey_by_token`, `validate_feedback_token`
  and `submit_feedback` are token-guarded and must stay anon-callable for customers.
  `get_user_organization_id`, `get_user_role` and `is_platform_user` must stay
  executable by `authenticated`: RLS policy expressions evaluate as the querying
  role, so revoking these would break row-level security everywhere.

- **OPEN · Leaked password protection is disabled · Supabase Auth · needs a dashboard change, not code.**
  Enable it under Auth so Supabase checks new passwords against HaveIBeenPwned.
