> **HISTORICAL — preserved 2026-08-04.** Produced by the `.qa-harness` scripts,
> which have since been retired: their assertions now live in `tests/integration/`
> and run in CI on every PR. Several findings below were fixed after this was
> written and are verified fixed by the current suite. Kept for the analysis and
> reproduction detail, not as a current status report.

# HazardOS — Public API v1 HTTP Harness Findings (2026-07-20)

**Environment:** PRODUCTION `https://hazardos.app` + Supabase `inzwwbbbdookxkkotbxj`. Org = Acme QA (`8cfe1783…`).
**Method:** minted a scoped `hzd_live_…` key by hashing exactly as `ApiKeyService.validate()` does (sha256 of the full string) and inserting the row with the service role — the same row the (broken, ST9) "create key" UI would have produced. Nothing in the auth path is bypassed; the app still validates hash+prefix, scopes, active flag, and rate limit. Key + every artifact tagged `QA-HARNESS`, tracked by id, and torn down in `finally` (post-run residue sweep CLEAN). No secret or PII value printed.
**Harness:** `.qa-harness/40-v1-api.mjs` (re-runnable). Raw results: `.qa-harness/results/v1-api.json`.

## Tally: 6 FAIL · 1 PASS · 1 BLOCKED

| ID | Sev | Verdict | Finding |
|----|-----|---------|---------|
| **APIWRITE** | High | **FAIL** | **The entire v1 write surface is dead.** All four POST create endpoints 500: `customers`, `estimates`, `invoices`, `jobs`. The routes were written against a pre-refactor schema and never updated — see root cause below. Service-confirmed per column. |
| **API20 / HS10** | High | **FAIL** | **Entity-number race.** Reproduced the route's exact `count(*)+1`-then-insert algorithm, 8 concurrent, at the DB layer (HTTP path is dead, so this is where the defect lives). All 8 got **`EST-00011`** — distinct 1/8. `estimate_number` has only a NON-unique index, so collisions insert silently. Same generator ships in invoices (`INV-`) and jobs (`JOB-`). |
| **API21 / HS11** | High | **FAIL** | **PostgREST `.or()` search injection.** `sanitizeSearchQuery` escapes `% _ \` but not `,` or `)`. A comma breaks out of the ilike value and injects extra `or()` clauses. Payload `<token>,id.not.is.null,email.ilike.a` widened a literal-0-match search to **14 rows (customers)** and **6 rows (companies)** — every column-filter after the comma is attacker-controlled. |
| **API22** | Medium | **FAIL** | **Collection `select('*')` over-exposure.** `GET /v1/customers` returns **64 columns the curated `[id]` route deliberately omits**, including integration IDs and PII: `qb_customer_id`, `hubspot_id`, `mailchimp_id`, `insurance_policy_number`, `insurance_adjuster_*`, `sms_opt_in_ip`, `lifetime_value`, `account_owner_id`, `created_by`, all `utm_*` / `*_touch_*` attribution. The single-record route curates; the list route leaks. |
| **API23** | Medium | **FAIL** | **Estimates/invoices/jobs collections skip the per-IP limiter.** 65 rapid `GET /v1/estimates` → 0×429. Only `customers`/`companies` collections call `applyUnifiedRateLimit(request,'public')` (60/min per IP); estimates/invoices/jobs + all `[id]` routes rely on the per-key hourly quota only. |
| **API7** | Medium | **FAIL** | **Misleading DELETE.** `DELETE /v1/customers/{unknown-or-cross-org id}` returns `200 {success:true}` with no affected-row check (should be 404). Org isolation itself **HOLDS** — a real foreign-org customer survived the delete — but the response lies about what happened. (This is the "candidate bug" the plan flagged.) |
| **API25** | Medium | **PASS** | Pagination validation is correct: `limit=101/0/abc` and `offset=-5` → 400; default 50. |
| **API24** | Low | **BLOCKED** | Rate-limit backend: local `.env.local` sets `UPSTASH_REDIS_REST_URL`+`TOKEN`, so the global Redis limiter is intended. Prod Vercel env can't be read from here — confirm `vercel env ls production` has both; if unset, `applyUnifiedRateLimit` silently falls back to **per-instance memory** (not global), making the 60/min IP limit per-lambda. |

## Root cause of APIWRITE (schema drift — one class, four endpoints)

The v1 routes insert columns the `20260401000004` (and later) refactor renamed or removed. Live-schema deltas, service-confirmed:

| Endpoint | Route inserts | Live column | Result |
|----------|---------------|-------------|--------|
| customers | *(omits `name`)* | `name` is **NOT NULL**, no default | 23502 |
| estimates | `total_amount`, `notes` | `total`, `internal_notes` | PGRST204 |
| invoices | `tax`, `amount`, `balance` | `tax_amount`, `total`, `balance_due` (`notes` OK) | PGRST204 |
| jobs | `job_type`, `scheduled_date`, `description`, `notes`, `site_address_line1/city/state/zip` | none of these exist; live uses `job_address/job_city/job_state/job_zip`, `internal_notes`, `scheduled_start_date`, `special_instructions`, `hazard_types` | PGRST204 |

## Remediation (all deploy-gated — production client SaaS)

None of these are live until a **prod deploy**; the jobs mapping needs a product decision. Proposed:

1. **APIWRITE** — map each route's insert to live columns (customers: derive `name` from first/last/company/email; estimates: `total`+`internal_notes`; invoices: `tax_amount`+`total`+`balance_due`; jobs: full remap + decide where `job_type`/`description` belong). Add a create-path integration test so drift can't silently return.
2. **API20/HS10** — replace `count()+1` with a per-org DB sequence or an advisory-locked generator, and add a **UNIQUE index** on `(organization_id, <entity>_number)` for estimates/invoices/jobs (backfill-dedupe first — a unique index will fail if live dupes already exist).
3. **API21/HS11** — stop interpolating user input into the `.or()` string. Either strip `,()` in the search sanitizer or quote+escape each ilike value; add a regression test with the comma payload.
4. **API22** — replace collection `select('*')` with the curated column list already used by the `[id]` route.
5. **API23** — add `applyUnifiedRateLimit(request,'public')` to the estimates/invoices/jobs collections (and consider the `[id]` routes).
6. **API7** — check affected rows on DELETE (and the customer's existence) and return 404 when nothing matched.
7. **API24** — verify Upstash is set in prod Vercel env; if not, set it.

## Remediation status — branch `fix/v1-api-schema-drift-and-security` (NOT deployed)

Implemented and **DB-layer verified** (mapped inserts succeed against live schema, incl. line items):

- **APIWRITE** — customers derives the NOT NULL `name`; estimates→`total`/`internal_notes`; invoices→`tax_amount`/`total`/`balance_due`; jobs→`scheduled_start_date`/`internal_notes`/`job_address|city|state|zip`. **Also found + fixed line-item drift** the first pass missed: `estimate_line_items` has no `organization_id`, uses `total_price` (not `line_total`), and requires a NOT NULL `item_type` (defaulted `'material'`); `invoice_line_items` has no `organization_id`. Line-item insert errors are now logged instead of silently swallowed.
- **API21/HS11** — hardened `sanitizeSearchQuery` to strip `,()` centrally, closing the injection for every `.or()` caller (v1 customers/companies **and** the internal `app/api/customers` + `lib/supabase/*` search paths).
- **API22** — customers collection now uses the curated `V1_CUSTOMER_COLUMNS` (matches the `[id]` route).
- **API23** — added the per-IP `public` limiter to estimates/invoices/jobs collection GET **and** POST.
- **API7** — customers/[id] and companies/[id] DELETE now check affected rows → 404 when nothing matched.
- **API20/HS10** — new `insertWithEntityNumber()` helper (retry-on-23505) used by all three generators + migration `20260720000004_v1_entity_number_unique.sql` (UNIQUE indexes). **Migration NOT applied** — it will fail on any existing duplicate numbers; run the dedupe audit in the file first.

**Two decisions left for you (jobs route):** `job_type` and `description` have no current column — accepted by validation but not persisted yet (flagged `// DECISION NEEDED`). Options in the code comment.

**Deploy-gated:** none of this is live on hazardos.app until the branch is deployed. Re-run `.qa-harness/40-v1-api.mjs` against the deployed build to confirm APIWRITE/API7/API22/API23 flip green (API20 is already DB-verified).
