# Compliance & Credential Tracking

Tracks, per worker, the licenses and clearances a hazardous-materials firm must
hold — asbestos worker/supervisor licenses, lead (RRP) certifications,
respirator fit tests, and medical clearances — each with an issuing authority,
identifier, and **expiry date**. It provides (a) a place to record them, (b)
proactive expiry alerting, and (c) a **crew-assignment gate** that warns when an
assigned worker lacks a current credential required for a job's containment
level / hazard types.

## Data model

- **`credential_types`** — per-org catalog of what can be tracked. `category`,
  `applies_to` (`worker` in Phase 1; `asset` reserved), `default_valid_days`
  (auto-suggest expiry), `warning_lead_days` (per-type "expiring soon" window,
  default 30), and the requirement mappings `required_for_containment_levels[]`
  (`type_i|type_ii|type_iii`) and `required_for_hazard_types[]` (matches
  `jobs.hazard_types`). A starter set is seeded per org via an
  `AFTER INSERT ON organizations` trigger (mirrors pipeline-stage seeding); the
  mappings are editable defaults, not regulatory truth.
- **`credentials`** — held instances. Exactly one subject: `worker_id`
  (→ `profiles`) **or** `asset_id` (reserved), enforced by a CHECK; both keep
  composite-FK org-integrity. Nullable `expiry_date` (some credentials never
  expire), `document_path` for the uploaded cert.
- **`credential_alerts`** — one row per `(credential, threshold_days)` so the
  daily sweep never re-alerts the same bucket. Cleared on renewal.
- **`organizations.credential_assignment_enforcement`** — `warn` (default) or
  `block`, read by the assignment gate.

**Derived status** (`valid | expiring_soon | expired | no_expiry`) is computed,
never stored — it depends on "today". Primary derivation is the service helper
`deriveCredentialStatus()` (mirrors the derived payment-status convention); the
`credential_status` `security_invoker` view exposes the same for SQL/reporting.

## Backend

- `lib/validations/credential.ts` — Zod schemas.
- `lib/services/credentials/` — `CredentialsService` (CRUD, `getExpiring`,
  `getExpired`, `getWorkerCredentials`, `getComplianceForJob`,
  `checkWorkerForJob`) plus pure helpers (`deriveCredentialStatus`,
  `resolveRequiredTypes`, `evaluateWorker`).
- API: `/api/credential-types`, `/api/credentials`, and
  `/api/jobs/[id]/compliance` (`?worker_id=` for the single-worker gate check).
  All via `createApiHandler` — read = any org member, writes = admin/owner.
- `lib/services/credential-expiry-service.ts` + `/api/cron/credential-expiry`
  (daily Vercel cron, `withCronLogging`) — sweeps credentials crossing
  30/14/7/0-day buckets, de-dupes, and alerts org admins in-app + email via the
  existing notification/email services. RLS is bypassed with the admin client
  because the cron has no user session.

## The crew-assignment gate

When a worker is added to a job whose containment level / hazard types require
credentials the worker lacks or holds-but-expired, the UI surfaces an inline
warning listing exactly what's missing/expired. Behavior is **warn by default**;
an org can switch `credential_assignment_enforcement` to `block` to reject the
assignment. `getComplianceForJob` also drives a crew-readiness badge on the job.

## Tests

`test/services/credentials.test.ts` and `credential-expiry.test.ts` cover
derived status, requirement resolution, worker evaluation (valid/missing/expired/
expiring), and the expiry-threshold de-dup buckets. RLS tenant isolation is
verified out-of-band by `scripts/verify-credential-rls.mjs` (kept out of the
hermetic vitest suite because it needs real signed-in sessions).

---

## Phase 2 — designed for, NOT built

The primitive was built so these plug in without reshaping the schema:

- **Equipment calibration.** `credentials.asset_id` and the
  `equipment_calibration` category already exist. A future org-scoped `assets`
  table can reuse the entire primitive — same expiry sweep, same alerting, same
  forms — by populating `asset_id` instead of `worker_id`. Do not add the
  `assets` table or UI until that phase.
- **Safety / incident + OSHA 300/300A.** Its own module later. It reuses this
  feature's alerting/notification and form patterns but has its own tables.
- **Certified / prevailing-wage payroll.** Out of scope and intentionally not
  built here — it's a specialist integration to be wired later, never a
  from-scratch build. Do not add it to this feature by drift.
