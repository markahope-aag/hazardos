-- Activity model: the vocabulary and work-item shape an automation chain needs.
--
-- Context: docs/marketsharp-hazardos-diff.md. Advanced Health & Safety are
-- moving off MarketSharp, where the work is driven by ~116,000 "activities"
-- against 7,650 contacts. Fifteen work items per contact. Their office manager
-- is assigned 89% of them. Any system replacing that has to be at least as good
-- at generating, assigning and chasing dated work items.
--
-- HazardOS already had `follow_ups`, which is the right shape (org, polymorphic
-- entity, due date, assignee, completion) but too thin: no type, no outcome, no
-- reminder offset, and no way to tell a machine-generated step from something a
-- person typed. This adds the two vocabulary tables and those columns.
--
-- Multi-tenancy note: this ships an *engine* plus *defaults*. The vocabulary is
-- per-organization data seeded with a generic starter set, so a second
-- remediation company gets something sensible without a deploy and can change
-- all of it. AHS's own 35 live references are imported as their rows, not
-- baked in here.

-- ---------------------------------------------------------------------------
-- Vocabulary: what kind of step this is
-- ---------------------------------------------------------------------------
-- MarketSharp splits a step into a Type (Call Out / Email Out / Text Out /
-- To-Do) and a Reference (the label, e.g. "Confirm Appointment"). Same split
-- here: `kind` is a fixed set the engine understands, `name` is the tenant's
-- own wording.

CREATE TABLE IF NOT EXISTS "public"."activity_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" DEFAULT 'todo'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    -- Shipped defaults are marked so the UI can warn before deleting one and
    -- so a reseed can tell them apart from the tenant's own entries.
    "is_system" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_types_kind_check" CHECK (("kind" = ANY (ARRAY['call'::"text", 'email'::"text", 'text'::"text", 'todo'::"text"]))),
    CONSTRAINT "activity_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."activity_types" OWNER TO "postgres";

-- Case-insensitive so a tenant can't end up with "Confirm appointment" and
-- "Confirm Appointment" as separate entries, which is how AHS accumulated
-- near-duplicates ("Confirm Appointment" and "Confirm appt" both exist there).
CREATE UNIQUE INDEX IF NOT EXISTS "activity_types_org_name_key"
    ON "public"."activity_types" ("organization_id", "lower"("name"));

COMMENT ON TABLE "public"."activity_types" IS
  'Per-organization vocabulary of work-item types. `kind` is what the engine acts on; `name` is the tenant''s own label.';

-- ---------------------------------------------------------------------------
-- Vocabulary: how a step turned out
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."activity_outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    -- MarketSharp has an outcome literally called "Done (doesn't add activity
    -- process)". Completing a step normally advances the chain, and they
    -- needed an explicit way to stop it. Model that as a flag rather than a
    -- magic name.
    "halts_chain" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_outcomes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_outcomes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."activity_outcomes" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "activity_outcomes_org_name_key"
    ON "public"."activity_outcomes" ("organization_id", "lower"("name"));

COMMENT ON COLUMN "public"."activity_outcomes"."halts_chain" IS
  'When true, completing a step with this outcome stops the automation chain instead of advancing it.';

-- ---------------------------------------------------------------------------
-- The work item itself
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."follow_ups"
    ADD COLUMN IF NOT EXISTS "kind" "text" DEFAULT 'todo'::"text" NOT NULL,
    ADD COLUMN IF NOT EXISTS "activity_type_id" "uuid",
    ADD COLUMN IF NOT EXISTS "outcome_id" "uuid",
    -- Minutes before due_date to remind. Null means no reminder, which is what
    -- most of AHS's live steps use.
    ADD COLUMN IF NOT EXISTS "reminder_minutes" integer,
    ADD COLUMN IF NOT EXISTS "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    -- Identifier in the system this row came from, e.g. a MarketSharp activity
    -- id. Lets an import run twice without duplicating, which matters because
    -- cutover needs a snapshot then a delta.
    ADD COLUMN IF NOT EXISTS "external_ref" "text";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_kind_check') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_kind_check"
      CHECK (("kind" = ANY (ARRAY['call'::"text", 'email'::"text", 'text'::"text", 'todo'::"text"])));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_source_check') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_source_check"
      CHECK (("source" = ANY (ARRAY['manual'::"text", 'process'::"text", 'import'::"text"])));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_activity_type_id_fkey') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_activity_type_id_fkey"
      FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_outcome_id_fkey') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_outcome_id_fkey"
      FOREIGN KEY ("outcome_id") REFERENCES "public"."activity_outcomes"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Re-running an import must not duplicate. Partial so rows created by hand
-- (external_ref null) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "follow_ups_org_external_ref_key"
    ON "public"."follow_ups" ("organization_id", "external_ref")
    WHERE "external_ref" IS NOT NULL;

-- The work queue query: one person's open items, soonest first. Partial index
-- because a completed item never appears in it, and at AHS's rate the completed
-- rows will outnumber open ones within months.
CREATE INDEX IF NOT EXISTS "follow_ups_open_by_assignee_idx"
    ON "public"."follow_ups" ("organization_id", "assigned_to", "due_date")
    WHERE "completed_at" IS NULL;

-- Same view unfiltered by person, for a team-wide queue and for overdue sweeps.
CREATE INDEX IF NOT EXISTS "follow_ups_open_by_due_idx"
    ON "public"."follow_ups" ("organization_id", "due_date")
    WHERE "completed_at" IS NULL;

COMMENT ON COLUMN "public"."follow_ups"."source" IS
  'manual = a person created it, process = an automation chain did, import = carried in from a previous system.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Same shape as pipeline_stages: everyone in the org reads, only write roles
-- change. Org scoping alone is not enough, a raw client write from a viewer
-- would otherwise succeed.

ALTER TABLE "public"."activity_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_outcomes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_types_select_org" ON "public"."activity_types"
    FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));

CREATE POLICY "activity_types_insert_write_roles" ON "public"."activity_types"
    FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));

CREATE POLICY "activity_types_update_write_roles" ON "public"."activity_types"
    FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))))
    WITH CHECK ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));

CREATE POLICY "activity_types_delete_write_roles" ON "public"."activity_types"
    FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));

CREATE POLICY "activity_outcomes_select_org" ON "public"."activity_outcomes"
    FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));

CREATE POLICY "activity_outcomes_insert_write_roles" ON "public"."activity_outcomes"
    FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));

CREATE POLICY "activity_outcomes_update_write_roles" ON "public"."activity_outcomes"
    FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))))
    WITH CHECK ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));

CREATE POLICY "activity_outcomes_delete_write_roles" ON "public"."activity_outcomes"
    FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));

-- A technician can't create or reassign work, but has to be able to finish
-- their own. The existing follow_ups write policies stop at estimator, which
-- would leave a crew member unable to close a to-do assigned to them.
CREATE POLICY "follow_ups_update_own_assignment" ON "public"."follow_ups"
    FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"())
        AND ("assigned_to" = "auth"."uid"())))
    WITH CHECK ((("organization_id" = "public"."get_user_organization_id"())
        AND ("assigned_to" = "auth"."uid"())));

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER "set_activity_types_updated_at"
    BEFORE UPDATE ON "public"."activity_types"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_activity_outcomes_updated_at"
    BEFORE UPDATE ON "public"."activity_outcomes"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- ---------------------------------------------------------------------------
-- Defaults for a new organization
-- ---------------------------------------------------------------------------
-- Deliberately generic remediation-industry steps, not AHS's list. A new
-- tenant should recognize these and be able to rename or delete any of them.
-- SECURITY DEFINER because the inserting session is the new user, who has no
-- org membership yet and would otherwise fail the RLS write check.

CREATE OR REPLACE FUNCTION "public"."create_default_activity_vocabulary"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.activity_types (organization_id, name, kind, is_system, sort_order)
  VALUES
    (NEW.id, 'Initial contact',            'call',  true,  1),
    (NEW.id, 'Confirm appointment',        'call',  true,  2),
    (NEW.id, 'Appointment reminder',       'text',  true,  3),
    (NEW.id, 'Pre-appointment email',      'email', true,  4),
    (NEW.id, 'Schedule site survey',       'todo',  true,  5),
    (NEW.id, 'Send estimate',              'email', true,  6),
    (NEW.id, 'Follow up on estimate',      'call',  true,  7),
    (NEW.id, 'Chase lab results',          'todo',  true,  8),
    (NEW.id, 'File regulatory notification','todo', true,  9),
    (NEW.id, 'Send invoice',               'email', true, 10),
    (NEW.id, 'Chase payment',              'call',  true, 11),
    (NEW.id, 'Thank you',                  'email', true, 12);

  INSERT INTO public.activity_outcomes (organization_id, name, halts_chain, is_system, sort_order)
  VALUES
    (NEW.id, 'Completed',            false, true, 1),
    (NEW.id, 'Left message',         false, true, 2),
    (NEW.id, 'No answer',            false, true, 3),
    (NEW.id, 'Call back later',      false, true, 4),
    (NEW.id, 'Rescheduled',          false, true, 5),
    (NEW.id, 'Delivery failed',      false, true, 6),
    (NEW.id, 'Not interested',       true,  true, 7),
    (NEW.id, 'Do not contact',       true,  true, 8),
    (NEW.id, 'Done, stop follow-up', true,  true, 9);

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."create_default_activity_vocabulary"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "create_activity_vocabulary_for_new_org"
    AFTER INSERT ON "public"."organizations"
    FOR EACH ROW EXECUTE FUNCTION "public"."create_default_activity_vocabulary"();

-- Backfill organizations that already exist, so this is not only true for
-- tenants created from now on.
DO $$
DECLARE
  org record;
BEGIN
  FOR org IN SELECT "id" FROM "public"."organizations" LOOP
    IF NOT EXISTS (SELECT 1 FROM "public"."activity_types" WHERE "organization_id" = org.id) THEN
      INSERT INTO public.activity_types (organization_id, name, kind, is_system, sort_order)
      VALUES
        (org.id, 'Initial contact',            'call',  true,  1),
        (org.id, 'Confirm appointment',        'call',  true,  2),
        (org.id, 'Appointment reminder',       'text',  true,  3),
        (org.id, 'Pre-appointment email',      'email', true,  4),
        (org.id, 'Schedule site survey',       'todo',  true,  5),
        (org.id, 'Send estimate',              'email', true,  6),
        (org.id, 'Follow up on estimate',      'call',  true,  7),
        (org.id, 'Chase lab results',          'todo',  true,  8),
        (org.id, 'File regulatory notification','todo', true,  9),
        (org.id, 'Send invoice',               'email', true, 10),
        (org.id, 'Chase payment',              'call',  true, 11),
        (org.id, 'Thank you',                  'email', true, 12);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "public"."activity_outcomes" WHERE "organization_id" = org.id) THEN
      INSERT INTO public.activity_outcomes (organization_id, name, halts_chain, is_system, sort_order)
      VALUES
        (org.id, 'Completed',            false, true, 1),
        (org.id, 'Left message',         false, true, 2),
        (org.id, 'No answer',            false, true, 3),
        (org.id, 'Call back later',      false, true, 4),
        (org.id, 'Rescheduled',          false, true, 5),
        (org.id, 'Delivery failed',      false, true, 6),
        (org.id, 'Not interested',       true,  true, 7),
        (org.id, 'Do not contact',       true,  true, 8),
        (org.id, 'Done, stop follow-up', true,  true, 9);
    END IF;
  END LOOP;
END $$;
