-- Activity process rules: what makes a chain fire.
--
-- Context: docs/marketsharp-hazardos-diff.md item P1-2, and section 6 of
-- docs/marketsharp-audit.md.
--
-- MarketSharp has three separate rule screens (Activity Rules, Appointment
-- Rules, Inquiry Rules) that all do the same thing: match something that
-- happened, then add a named process. They are three screens because they were
-- built at three different times, not because they are three different ideas.
-- One table here.
--
-- Qualifier columns are nullable and a NULL means "any", which is exactly what
-- MarketSharp's "-- Any --" option does. Their rule "Email Failure on any
-- reference fires Bad email bounce" is one row with the outcome set and the
-- activity type left null.
--
-- Typed columns rather than a JSONB blob of conditions. Every qualifier points
-- at something we already model, so foreign keys can enforce that a rule
-- references a stage or an outcome that actually exists. A new event type will
-- need a migration, which is right: the engine has to learn to emit it anyway.

CREATE TABLE IF NOT EXISTS "public"."activity_process_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,

    -- Optional human label. Their rules are readable enough from the parts,
    -- but a name helps when two rules differ only by a segment filter.
    "name" "text",

    "event_type" "text" NOT NULL,

    -- Qualifiers. NULL means "any". Which ones are meaningful depends on
    -- event_type, enforced below.
    "activity_type_id" "uuid",
    "outcome_id" "uuid",
    "pipeline_stage_id" "uuid",
    "job_status" "text",
    "lab_result" "text",
    "message_channel" "text",

    -- Segment filter, meaningful on every event type.
    --
    -- This is the one place we deliberately improve on their model rather than
    -- copy it. AHS separate residential from contractor work by overloading the
    -- outcome value ("Completed" vs "Contractor completed"), which is why they
    -- have near-duplicate processes: "Post Sale Thank You" and "Contractor post
    -- sale THANK YOU", "Lead-AHS After Proposal Sent" and "Commercial: After
    -- proposal sent". We hold contact type as a real field, so the same chain
    -- can be filtered instead of duplicated.
    "contact_type" "text",

    "process_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,

    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    CONSTRAINT "activity_process_rules_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "activity_process_rules_event_type_check" CHECK (("event_type" = ANY (ARRAY[
        'activity_completed'::"text",
        'opportunity_stage_changed'::"text",
        'job_status_changed'::"text",
        'lab_result_received'::"text",
        'message_failed'::"text"
    ]))),

    CONSTRAINT "activity_process_rules_lab_result_check" CHECK (
        "lab_result" IS NULL OR "lab_result" = ANY (ARRAY['positive'::"text", 'negative'::"text"])),

    CONSTRAINT "activity_process_rules_message_channel_check" CHECK (
        "message_channel" IS NULL OR "message_channel" = ANY (ARRAY['email'::"text", 'sms'::"text"])),

    CONSTRAINT "activity_process_rules_contact_type_check" CHECK (
        "contact_type" IS NULL OR "contact_type" = ANY (ARRAY['residential'::"text", 'commercial'::"text"])),

    -- A qualifier that belongs to another event type is not a harmless extra
    -- column, it is a rule that reads as more specific than it behaves. Reject
    -- it rather than ignore it.
    CONSTRAINT "activity_process_rules_qualifiers_match_event" CHECK (
        CASE "event_type"
            WHEN 'activity_completed' THEN
                "pipeline_stage_id" IS NULL AND "job_status" IS NULL
                AND "lab_result" IS NULL AND "message_channel" IS NULL
            WHEN 'opportunity_stage_changed' THEN
                "activity_type_id" IS NULL AND "outcome_id" IS NULL
                AND "job_status" IS NULL AND "lab_result" IS NULL AND "message_channel" IS NULL
            WHEN 'job_status_changed' THEN
                "activity_type_id" IS NULL AND "outcome_id" IS NULL
                AND "pipeline_stage_id" IS NULL AND "lab_result" IS NULL AND "message_channel" IS NULL
            WHEN 'lab_result_received' THEN
                "activity_type_id" IS NULL AND "outcome_id" IS NULL
                AND "pipeline_stage_id" IS NULL AND "job_status" IS NULL AND "message_channel" IS NULL
            WHEN 'message_failed' THEN
                "activity_type_id" IS NULL AND "outcome_id" IS NULL
                AND "pipeline_stage_id" IS NULL AND "job_status" IS NULL AND "lab_result" IS NULL
            ELSE false
        END
    ),

    CONSTRAINT "activity_process_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_process_rules_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."activity_processes"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_process_rules_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_process_rules_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "public"."activity_outcomes"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_process_rules_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_process_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."activity_process_rules" OWNER TO "postgres";

COMMENT ON TABLE "public"."activity_process_rules" IS
  'What makes an activity process fire. One row per rule. NULL qualifiers mean "any", matching MarketSharp''s "-- Any --".';

COMMENT ON COLUMN "public"."activity_process_rules"."contact_type" IS
  'Optional segment filter. Lets one chain serve residential and commercial rather than duplicating the chain per segment.';

-- The engine's lookup: given an event on an org, which rules apply. Deliberately
-- covers only the columns every evaluation filters on; the qualifiers are
-- checked against the handful of rows this returns.
CREATE INDEX IF NOT EXISTS "activity_process_rules_lookup_idx"
    ON "public"."activity_process_rules" ("organization_id", "event_type", "sort_order")
    WHERE "is_active" = true;

-- Two identical rules would fire the same chain twice and create duplicate
-- work. NULLS NOT DISTINCT so "any" counts as a value rather than making every
-- row unique by virtue of its nulls.
CREATE UNIQUE INDEX IF NOT EXISTS "activity_process_rules_unique_condition"
    ON "public"."activity_process_rules" (
        "organization_id", "event_type", "activity_type_id", "outcome_id",
        "pipeline_stage_id", "job_status", "lab_result", "message_channel",
        "contact_type", "process_id"
    ) NULLS NOT DISTINCT;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."activity_process_rules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_process_rules_select_org" ON "public"."activity_process_rules"
    FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));

CREATE POLICY "activity_process_rules_insert_write_roles" ON "public"."activity_process_rules"
    FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));

CREATE POLICY "activity_process_rules_update_write_roles" ON "public"."activity_process_rules"
    FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))))
    WITH CHECK ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));

CREATE POLICY "activity_process_rules_delete_write_roles" ON "public"."activity_process_rules"
    FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"())
        AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));

CREATE OR REPLACE TRIGGER "set_activity_process_rules_updated_at"
    BEFORE UPDATE ON "public"."activity_process_rules"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Rules are admin-only to write, unlike processes and vocabulary which
-- estimators can edit. A rule silently changes what happens to every future
-- record; a process definition only takes effect where a rule points at it.

-- ---------------------------------------------------------------------------
-- Keep a rule inside its own tenant
-- ---------------------------------------------------------------------------
-- Same reasoning as the process step guard: organization_id is denormalized so
-- RLS is a column check, which is only sound if it matches everything the rule
-- references.

CREATE OR REPLACE FUNCTION "public"."enforce_process_rule_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  mismatch text;
BEGIN
  SELECT 'process' INTO mismatch
  FROM public.activity_processes
  WHERE id = NEW.process_id AND organization_id IS DISTINCT FROM NEW.organization_id;

  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Rule organization does not match its process organization';
  END IF;

  IF NEW.activity_type_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.activity_types
    WHERE id = NEW.activity_type_id AND organization_id IS DISTINCT FROM NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Rule organization does not match its activity type organization';
  END IF;

  IF NEW.outcome_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.activity_outcomes
    WHERE id = NEW.outcome_id AND organization_id IS DISTINCT FROM NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Rule organization does not match its outcome organization';
  END IF;

  IF NEW.pipeline_stage_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pipeline_stages
    WHERE id = NEW.pipeline_stage_id AND organization_id IS DISTINCT FROM NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Rule organization does not match its pipeline stage organization';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."enforce_process_rule_org"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "activity_process_rules_org_guard"
    BEFORE INSERT OR UPDATE ON "public"."activity_process_rules"
    FOR EACH ROW EXECUTE FUNCTION "public"."enforce_process_rule_org"();
