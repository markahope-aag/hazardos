# Technical Debt

Living list of known issues, deferred work, and future improvements. Update when you ship a deferral or close an item.

## How to use this file

- **Add** items when you knowingly take a shortcut, defer a fix, or notice something worth revisiting.
- **Remove** items when the work ships.
- Each item should say **what**, **why deferred**, and **proposed approach** so future-you (or someone else) doesn't have to re-derive it.

---

## Drop `site_surveys.photo_metadata` JSONB column

**What:** The JSONB photo array on `site_surveys` is now redundant — every new upload writes to `survey_photos` (the relational source of truth) and the display resolver routes both old and new paths correctly. The column itself can go.

**Why deferred:** The display layer still reads JSONB as its primary data source; survey_photos is dual-write today. We need to (a) cut the gallery / mobile photo views over to query `survey_photos` by `site_survey_id`, (b) confirm in production that no read fallback to JSONB has fired for ~30 days, and (c) only then drop the column. Doing it sooner risks a no-photos-displayed regression on rows that exist in JSONB but not yet in `survey_photos`.

**Proposed approach:**

1. Add `GET /api/site-surveys/[id]/photos` returning `survey_photos` rows in the shape the gallery expects.
2. Switch `MediaSection`, the mobile thumbnail/detail views, and the survey-detail tab badge to consume that endpoint instead of `survey.photo_metadata`.
3. Stop writing JSONB in `survey-mappers.ts` and `media-section.tsx` (mobile capture flow + desktop drag-drop).
4. Add a structured log line whenever the legacy JSONB read path fires; monitor for 30 days.
5. Migration: `ALTER TABLE site_surveys DROP COLUMN photo_metadata;` plus a defensive backfill for any survey that has JSONB photos missing from `survey_photos`.

**Risk:** Surveys created during the dual-write window may have JSONB rows that didn't make it into `survey_photos` due to transient errors. The defensive backfill in step 5 covers this.

## Forensic photo pipeline — hash the pre-compression bytes

**What:** The SHA-256 hash stored alongside every stamped survey photo is computed against the JPEG that arrived at storage, *not* the raw bytes the camera produced. The PWA's mobile capture path passes images through a canvas-based compressor (`browser-image-compression`) before upload, which strips EXIF and re-encodes pixels.

**Why deferred:** Uploading the raw camera blob in addition to (or instead of) the compressed JPEG roughly doubles upload bandwidth on cellular and would require us to either keep two copies in storage forever or re-stamp from raw on demand. The compressed-original hash is still tamper-evident *as uploaded* — defense attorneys can verify the bytes we hold, just not that we hold the same bytes the sensor produced.

**Proposed approach:**

1. Capture the raw `File` object alongside the compressed blob in `photo-capture.tsx`.
2. Upload raw bytes to `originals-raw/...` (admin-only RLS, same scheme as `originals/`).
3. Hash the raw bytes; keep `file_hash` pointing at the camera output. Store the compressed-output hash separately for the on-disk JPEG verification.
4. Stamp continues to operate on the compressed JPEG (sharp doesn't need raw HEIC).
5. Provide a per-org setting to opt out of raw retention if storage cost is a concern.

**Risk:** None for current users — this is additive.

## Roles & Permissions — Phase 2: editable capabilities

**What:** Make role capabilities customizable per-organization. Currently `lib/auth/capabilities.ts` is a static read-only matrix surfaced at `/settings/roles`. Each `allowedRoles: ROLES.X` API guard is hardcoded.

**Why deferred:** Touches every API route in `app/api/`. Phase 1 (read-only matrix) lands the visible product surface in a few hours; Phase 2 is multi-day and only justified if customers actually ask for per-org customization. We haven't seen that demand yet.

**Proposed approach:**

1. Schema:
   ```sql
   CREATE TABLE role_capabilities (
     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
     role TEXT NOT NULL,
     capability_key TEXT NOT NULL,
     enabled BOOLEAN NOT NULL DEFAULT TRUE,
     PRIMARY KEY (organization_id, role, capability_key)
   );
   ```
2. Capability registry: a typed object in `lib/auth/capabilities.ts` mapping every keyed capability to a description and default-enabled-for-roles list.
3. `hasCapability(role, key)` helper that consults the table, falling back to the default.
4. Refactor every `allowedRoles: ROLES.X` site to `requiresCapability('key')`. This is the bulk of the work.
5. Toggle UI on `/settings/roles` — turn capabilities on/off per role.

**Risk:** A bad toggle lets a role do something we never tested. Need a way to "reset to defaults" and ideally a confirmation when removing a capability the user's own role depends on.

## Roles & Permissions — Phase 3: custom roles

**What:** Let admins define new roles beyond the five presets (e.g. "Sales Manager", "Site Lead"). Requires Phase 2 first.

**Why deferred:** Speculative. No customer has asked.

**Proposed approach:** `roles` table with `(organization_id, name, label, base_role)` where `base_role` defines the inherited capability set; then capabilities table joins on `role_id` instead of role string.

---

## Permissions audit deferrals (2026-04-30)

Items found by the role-permissions audit that we've intentionally deferred. HIGH and MEDIUM severity items are being fixed in the same pass that closes the technician-leak; the items below are LOW severity / cosmetic.

### Hide nav items for non-admin roles (cosmetic)

**What:** Main nav (`app/(dashboard)/layout.tsx:22-33`) shows every section to every role. Estimators and technicians see "Invoices" even though most of those API mutations are blocked.

**Why deferred:** API guards prevent actual harm; this is a UX cleanup, not a security fix. Fold into the larger nav-by-role pass once we decide whether technicians get a stripped-down "field mode" layout vs. the same nav.

**Proposed approach:** Add `requiredRoles?: UserRole[]` to `MAIN_NAV_ITEMS`, filter at render based on `useMultiTenantAuth().profile?.role`.

### Add `allowedRoles: ROLES.TENANT_READ` to consistency-only endpoints

**What:** A handful of read-only endpoints (e.g. `/api/activity-log`) have no `allowedRoles`. RLS already scopes them to the org. They behave correctly today.

**Why deferred:** Pure consistency improvement. No data leak — RLS catches it. Worth doing eventually so the convention is "every route declares its allowedRoles".

**Proposed approach:** Sweep `app/api/**/route.ts` for missing `allowedRoles`, add `ROLES.TENANT_READ` to GETs that don't already gate.
