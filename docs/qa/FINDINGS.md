> **HISTORICAL — preserved 2026-08-04.** Produced by the `.qa-harness` scripts,
> which have since been retired: their assertions now live in `tests/integration/`
> and run in CI on every PR. Several findings below were fixed after this was
> written and are verified fixed by the current suite. Kept for the analysis and
> reproduction detail, not as a current status report.

# HazardOS — Scripted Security/Integrity Harness Findings (2026-07-20)

**Environment:** PRODUCTION Supabase `inzwwbbbdookxkkotbxj` (same DB as live hazardos.app). Migrations current to `20260714000008`. All writes tagged `QA-HARNESS`, service-role reverted; residue check CLEAN.

**Method:** raw `@supabase/supabase-js` signed in as each seeded role (DB-layer RLS), not the browser. Every "hole" claim is **service-role read-back confirmed** (distinct sentinel value actually landed in the DB), which defeats the same-value / trigger-only-on-change false-positive.

## CONFIRMED DEFECTS (4) — ALL FIXED + re-verified (sheet: Status=Fail, Status(retest)=Pass)

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| **SEC17** | High | A **viewer** could UPDATE `opportunities` AND `pipeline_stages` via a raw client. RLS was org-only with no role gate (`20260220000002` / repaired in `20260421000003`), so `/api/pipeline` RBAC was bypassable. Same class `20260714000006` fixed for jobs/invoices — these two were left behind. | `20260720000001`: replaced the `FOR ALL` org-only policies with org-wide SELECT + role-scoped INSERT/UPDATE/DELETE (TENANT_WRITE). |
| **SEC19** | High | A **viewer** could UPDATE `estimates` via a raw client (INSERT/UPDATE org-only at RLS; RBAC only in the API). | `20260720000001`: dropped the org-only create/update policies, added role-scoped ones. |
| **ES15** | High | A **technician** could UPDATE `estimate_line_items.unit_price` on 6/6 estimates of every status — no role gate, bypassing the estimate lock. Live policy was a permissive `"Users can manage line items…" FOR ALL` from `20260401000004`. | `20260720000001` (role-scoped writes) + `20260720000003` (dropped the permissive FOR ALL). |
| **I14** | High | **Server accepted overpayment.** $500 via `record_invoice_payment` on a $100 invoice → `balance_due=-400, status='paid'`. RPC had no balance comparison. | `20260720000002`: RPC now rejects `amount <= 0` and `amount > balance_due` (23514) before inserting. |

**Post-fix re-run:** all 4 now Pass at the DB layer (viewer/technician writes → 0 rows; overpayment → 23514). **Regression (5/5):** estimator/admin still write all four tables; a valid $60 payment still posts (balance 40, status partial). No over-locking.
**Not yet git-committed** — 3 migrations applied to prod, files staged in repo, awaiting an explicit commit.

## VERIFIED SECURE (8) — written to sheet as Pass

- **SEC18** estimator cannot org-hop a job (WITH CHECK both-sided) — denied 42501
- **SEC23** admin-only address-change trigger blocks technician (42501); admin control passes
- **SEC25** anon cannot call `is_platform_user` / `get_user_organization_id` (grants revoked)
- **SEC26** one-org-per-user holds — existing user's 2nd `organizations` INSERT denied
- **SEC27** finalized-invoice lock holds — guarded money fields on a void invoice blocked (23514). (notes/status stay editable **by design** — the migration deliberately scopes the freeze to money-bearing fields.)
- **SEC28** reporting matviews revoked from `authenticated` (permission denied)
- **API7** cross-org isolation holds — Acme roles cannot read/update/insert an org2 row (verified against a real, torn-down 2nd org)

## FALSE RESULTS CAUGHT DURING SELF-REVIEW (why the rigor mattered)

- **SEC23** first ran Fail (same-value UPDATE slipped past the change-diff trigger) → corrected to real value change → **Pass**.
- **SEC27** first ran Fail (tested `notes`, an intentionally-unguarded field) → re-tested a guarded money field → **Pass**.
- **SEC28** first ran Fail (over-narrow error classifier) → corrected → **Pass**.
- **ES15** flipped Pass↔Fail on non-deterministic single-row fixtures → multi-row deterministic test → **Fail (6/6)**.

## NOT YET RUN (honest gap — needs infra, not faked)

- **API20 / HS10** (entity-number `count()+1` race) and **API21 / HS11** (`.or()` search-filter injection) require a seeded **v1 API key** + live HTTP calls to `/api/v1/*`. Key creation is itself broken (ST9), so a key hash must be hand-crafted. Left for a follow-up HTTP harness; currently `Not Started` in the sheet.
