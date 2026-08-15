-- Let an estimator mark which version of an estimate chain is "the one that
-- counts", instead of that always being implicitly whichever has the
-- highest version number.
--
-- Context: docs/client-feedback-2026-07-28.md P3 — "estimate version
-- list/mark-active". The version list (chain table, "Version X of Y" badge,
-- "you're viewing an old version" banner) already existed; this is the
-- missing "mark-active" half. Deliberately UI-facing only: nothing that
-- resolves an estimate_id today (job creation, proposal generation, the
-- dashboard stats RPC) is changed to read this flag. Those all pin to a
-- literal estimate_id chosen by a person at creation time already, so
-- leaving them alone matches how the rest of the app already treats a
-- specific estimate row as a stable reference, not "whatever's active now".

ALTER TABLE "public"."estimates"
    ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

COMMENT ON COLUMN "public"."estimates"."is_active" IS
  'Which version in this estimate''s chain (estimate_root_id) is the one currently in use. Exactly one true per chain, enforced by estimates_one_active_per_root. Defaults true on insert; create_estimate_revision flips it off the parent onto the new draft, and set_active_estimate_version lets a person move it explicitly.';

-- Backfill: before this column existed, "current" was implicitly "highest
-- version in the chain" — preserve that as the starting state rather than
-- leaving every row active.
UPDATE "public"."estimates" e
SET "is_active" = (e.version = latest.max_version)
FROM (
  SELECT "estimate_root_id", MAX("version") AS max_version
  FROM "public"."estimates"
  GROUP BY "estimate_root_id"
) latest
WHERE e."estimate_root_id" = latest."estimate_root_id";

-- Exactly one active row per chain. A partial unique index rather than a
-- deferred constraint: the RPC below always goes false-then-true within one
-- statement per row, so there's never a moment with two actives to defer past.
CREATE UNIQUE INDEX IF NOT EXISTS "estimates_one_active_per_root"
    ON "public"."estimates" ("estimate_root_id")
    WHERE "is_active";

-- ---------------------------------------------------------------------------
-- Move "active" to a specific version in the chain.
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER, same as create_estimate_revision: RLS still applies, so
-- this can only touch a chain the calling user's org can already see.

CREATE OR REPLACE FUNCTION "public"."set_active_estimate_version"(
    "p_estimate_id" "uuid",
    "p_organization_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_root_id uuid;
BEGIN
  -- Lock the whole chain for the duration, same reasoning as
  -- create_estimate_revision: two concurrent "mark active" calls on the same
  -- chain must not both end up thinking they won.
  SELECT estimate_root_id INTO v_root_id
  FROM estimates
  WHERE id = p_estimate_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate % not found', p_estimate_id
      USING ERRCODE = 'no_data_found';
  END IF;

  PERFORM 1 FROM estimates WHERE estimate_root_id = v_root_id FOR UPDATE;

  UPDATE estimates SET is_active = false
  WHERE estimate_root_id = v_root_id AND is_active AND id <> p_estimate_id;

  UPDATE estimates SET is_active = true
  WHERE id = p_estimate_id;
END;
$$;

ALTER FUNCTION "public"."set_active_estimate_version"("uuid", "uuid") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."set_active_estimate_version"("uuid", "uuid") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."set_active_estimate_version"("uuid", "uuid") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."set_active_estimate_version"("uuid", "uuid") TO "authenticated";

COMMENT ON FUNCTION "public"."set_active_estimate_version"("uuid", "uuid") IS
  'Moves is_active to p_estimate_id within its chain, unsetting whichever row had it. Locks the whole chain first so two concurrent calls cannot both succeed.';

-- ---------------------------------------------------------------------------
-- A new revision becomes active; the parent it was drafted from stops being
-- active. Matches what "Create Revised Version" already implies today (the
-- new draft is what you'd work from next) without requiring a second call.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."create_estimate_revision"(
  "p_parent_estimate_id" "uuid",
  "p_organization_id" "uuid",
  "p_created_by" "uuid",
  "p_estimate_number" "text",
  "p_revision_notes" "text" DEFAULT NULL::"text"
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_new_id uuid;
BEGIN
  PERFORM 1
  FROM estimates
  WHERE id = p_parent_estimate_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent estimate % not found', p_parent_estimate_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Clear the parent's active flag before inserting the new active row —
  -- the partial unique index checks immediately (not deferred), so doing
  -- this after the INSERT would have both rows active at once and fail.
  UPDATE estimates SET is_active = false WHERE id = p_parent_estimate_id;

  INSERT INTO estimates (
    organization_id, site_survey_id, customer_id, location_id,
    estimate_number, status, parent_estimate_id, revision_notes,
    project_name, project_description, scope_of_work,
    estimated_duration_days, estimated_start_date, estimated_end_date,
    valid_until, subtotal, markup_percent, markup_amount,
    discount_percent, discount_amount, tax_percent, tax_amount, total,
    internal_notes, created_by, is_active
  )
  SELECT
    organization_id, site_survey_id, customer_id, location_id,
    p_estimate_number, 'draft', id, p_revision_notes,
    project_name, project_description, scope_of_work,
    estimated_duration_days, estimated_start_date, estimated_end_date,
    valid_until, subtotal, markup_percent, markup_amount,
    discount_percent, discount_amount, tax_percent, tax_amount, total,
    internal_notes, p_created_by, true
  FROM estimates
  WHERE id = p_parent_estimate_id
  RETURNING id INTO v_new_id;

  INSERT INTO estimate_line_items (
    estimate_id, item_type, category, description, quantity, unit,
    unit_price, total_price, source_rate_id, source_table, sort_order,
    is_optional, is_included, notes
  )
  SELECT
    v_new_id, item_type, category, description, quantity, unit,
    unit_price, total_price, source_rate_id, source_table, sort_order,
    is_optional, is_included, notes
  FROM estimate_line_items
  WHERE estimate_id = p_parent_estimate_id
  ORDER BY sort_order ASC;

  RETURN v_new_id;
END;
$$;
