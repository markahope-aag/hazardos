# QA Autopilot — Flags (2026-07-20)

## RESOLVED (2026-08-17) · Browser automation: use native Chrome, not Playwright
The original 2026-07-20 flag read "No browser automation in session, ~360 UI test
cases remain Blocked" and prescribed installing the Playwright MCP. **That fix is
wrong for this setup and the flag is stale.** Browser-driven passes have been run
interactively for weeks using Claude Code's **native Chrome integration**
(`/chrome`), which is built in, needs no MCP, and therefore appears in neither
`claude mcp list` nor any file in this repo.

Left uncorrected, this line actively misleads: it reads as "no browser exists
here" to anyone checking the obvious places, and the prescribed Playwright MCP is
redundant at best. On this Windows setup Playwright's CDP transport is also
suspect, see the header of `../eydn-app/scripts/shoot.mjs`, which drives Chromium
through its own CLI because `--remote-debugging-pipe` hangs.

**Start a browser pass with `/chrome`.** Keep the skill's one-browser rule: reuse
the single session across cases rather than opening one per test.

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

### Follow-up triage, 2026-08-16 (second linter batch)

- **NOT A DEFECT · `create_organization(org_name, org_slug)` flagged as callable by signed-in users.**
  The function does not exist. It is absent from a fresh `supabase db dump` of the live
  database, and PostgREST answers `PGRST202` for it under any argument shape. Onboarding
  calls `create_organization_for_onboarding(p_org jsonb)` instead, which is present and
  correctly granted to `authenticated` only. The linter entry is served from its own
  cache (see `cache_key` on the finding), so it reflects a function dropped at some
  earlier point. Nothing to do beyond letting the linter cache age out.

- **NOT A DEFECT · `private.platform_admins` has RLS enabled with no policies.**
  Here that is the secure posture, not an oversight: RLS with no policy denies everyone
  except the table owner and service_role. On top of that the `private` schema is not
  exposed through PostgREST at all, confirmed by probing as anon, as a signed-in
  technician, and as service_role, each answering `PGRST106: Invalid schema: private`.
  The table is also not reachable under `public` (`PGRST205`). Adding policies here
  would widen access rather than tighten it, so this one should be left alone.

- **VERIFIED SOUND · The two RPCs that take an organization id.**
  `cancel_open_activity_work` and `create_activity_process_work` both accept
  `p_organization_id`, which is the same shape as the two functions that did turn out to
  be exploitable, so they were probed directly. Anon is refused ("No organization for the
  current user") and a signed-in technician naming another tenant's id is refused
  ("Organization mismatch: cannot create work for another tenant"). Org B's row count was
  unchanged across the attempt. These are properly guarded inside the function body.

- **VERIFIED SOUND · The RLS helper and org-management functions.**
  `get_user_role`, `get_user_organization_id`, `is_platform_user`,
  `organization_has_other_members`, `can_create_organization`,
  `allow_first_org_creation` and `calculate_completion_variance_by_job` all answer
  `42501` for anon, so their grants survived the baseline squash intact. The concern
  raised on 2026-08-15 about lost grant state appears limited to the four functions
  already fixed.
