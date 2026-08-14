-- Activity processes: named chains of work that fire off an event.
--
-- Context: docs/marketsharp-hazardos-diff.md, item P1-1. MarketSharp calls
-- these "activity processes". AHS have 27 defined and 13 wired to a trigger,
-- and the live ones were reconstructed from the activity records they create
-- (docs/marketsharp-audit.md section 6).
--
-- Shape follows what their editor actually exposes, because that is a working
-- design proven over four years rather than a guess: a process is an ordered
-- list of steps, and each step has a kind, a label, an assignee rule, a
-- due-date rule, an optional reminder, and a template when it sends something.
--
-- One MarketSharp field is deliberately not copied. Their process list has a
-- "For Production" column, empty on all 27 of AHS's processes, and we do not
-- know what it does. Copying a flag we cannot explain would be cargo-culting.
--
-- No default processes are seeded. Vocabulary generalizes across remediation
-- companies; chains do not. A new tenant gets an empty list and builds their
-- own, which is honest rather than shipping someone else's sales process.

-- ---------------------------------------------------------------------------
-- Email templates
-- ---------------------------------------------------------------------------
-- A sending step needs something to send. SMS already has a per-org editable
-- table; email copy is currently hardcoded across three files, which blocks
-- selling the product to a second company regardless of AHS. This adds the
-- table so steps have something real to reference. Moving the existing
-- hardcoded copy over is separate work (P0-6) and does not belong here.

CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."email_templates" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_org_name_key"
    ON "public"."email_templates" ("organization_id", "lower"("name"));

COMMENT ON TABLE "public"."email_templates" IS
  'Per-organization editable email copy. Mirrors sms_templates. Transactional system mail (password reset, and similar) stays in code and is not represented here.';

-- ---------------------------------------------------------------------------
-- Processes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."activity_processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    -- Whether a computed due date may land on a weekend. AHS's Sunday activity
    -- count exceeds their Saturday count, which is not people working: it is
    -- chains dropping due dates on days the office is shut. Without these the
    -- follow-up cadence drifts.
    "use_saturdays" boolean DEFAULT false NOT NULL,
    "use_sundays" boolean DEFAULT false NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_processes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_processes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_processes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."activity_processes" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "activity_processes_org_name_key"
    ON "public"."activity_processes" ("organization_id", "lower"("name"));

-- ---------------------------------------------------------------------------
-- Steps
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."activity_process_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "process_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,

    "kind" "text" DEFAULT 'todo'::"text" NOT NULL,
    "activity_type_id" "uuid",
    "note" "text",

    -- Who it lands on. AHS use all three of these in their live chains:
    -- a named person for the office manager's own work, unassigned for a queue
    -- anyone can pick up, and current user for whoever completed the step that
    -- triggered the chain.
    "assignee_mode" "text" DEFAULT 'unassigned'::"text" NOT NULL,
    "assigned_to" "uuid",

    -- When it is due, relative to the moment the chain fires.
    --   immediate           : now
    --   days_at_time        : due_days later, at due_time on the clock
    --   days_hours_minutes  : due_days + due_hours + due_minutes later
    "due_mode" "text" DEFAULT 'immediate'::"text" NOT NULL,
    "due_days" integer DEFAULT 0 NOT NULL,
    "due_time" time without time zone,
    "due_hours" integer DEFAULT 0 NOT NULL,
    "due_minutes" integer DEFAULT 0 NOT NULL,

    "reminder_minutes" integer,

    -- Only one of these is meaningful, decided by `kind`.
    "email_template_id" "uuid",
    "sms_template_id" "uuid",

    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    CONSTRAINT "activity_process_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_process_steps_kind_check" CHECK (("kind" = ANY (ARRAY['call'::"text", 'email'::"text", 'text'::"text", 'todo'::"text"]))),
    CONSTRAINT "activity_process_steps_assignee_mode_check" CHECK (("assignee_mode" = ANY (ARRAY['user'::"text", 'unassigned'::"text", 'current_user'::"text"]))),
    CONSTRAINT "activity_process_steps_due_mode_check" CHECK (("due_mode" = ANY (ARRAY['immediate'::"text", 'days_at_time'::"text", 'days_hours_minutes'::"text"]))),
    -- A named assignee is required when the mode says a named assignee, and
    -- meaningless otherwise. Without this a step can claim 'user' and land
    -- nowhere, which is silent and only shows up as work nobody sees.
    CONSTRAINT "activity_process_steps_assignee_present" CHECK (
        ("assignee_mode" <> 'user' AND "assigned_to" IS NULL)
        OR ("assignee_mode" = 'user' AND "assigned_to" IS NOT NULL)
    ),
    -- days_at_time needs a clock time to aim at.
    CONSTRAINT "activity_process_steps_due_time_present" CHECK (
        ("due_mode" <> 'days_at_time') OR ("due_time" IS NOT NULL)
    ),
    CONSTRAINT "activity_process_steps_offsets_sane" CHECK (
        "due_days" >= 0 AND "due_days" <= 3650
        AND "due_hours" >= 0 AND "due_hours" < 24
        AND "due_minutes" >= 0 AND "due_minutes" < 60
    ),
    CONSTRAINT "activity_process_steps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_process_steps_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."activity_processes"("id") ON DELETE CASCADE,
    CONSTRAINT "activity_process_steps_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE SET NULL,
    CONSTRAINT "activity_process_steps_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    CONSTRAINT "activity_process_steps_email_template_id_fkey" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE SET NULL,
    CONSTRAINT "activity_process_steps_sms_template_id_fkey" FOREIGN KEY ("sms_template_id") REFERENCES "public"."sms_templates"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."activity_process_steps" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "activity_process_steps_process_order_idx"
    ON "public"."activity_process_steps" ("process_id", "sort_order");

-- ---------------------------------------------------------------------------
-- Lineage on the work item
-- ---------------------------------------------------------------------------
-- A chain creates every one of its steps at once with staggered due dates,
-- which is how MarketSharp behaves and how the definitions were recoverable
-- from their data at all. So there is no run state machine to keep: the rows
-- themselves are the running chain. These two columns record where a work item
-- came from, which is what "cancel the rest of this chain" needs.

ALTER TABLE "public"."follow_ups"
    ADD COLUMN IF NOT EXISTS "process_id" "uuid",
    ADD COLUMN IF NOT EXISTS "process_step_id" "uuid";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_process_id_fkey') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_process_id_fkey"
      FOREIGN KEY ("process_id") REFERENCES "public"."activity_processes"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'follow_ups_process_step_id_fkey') THEN
    ALTER TABLE "public"."follow_ups"
      ADD CONSTRAINT "follow_ups_process_step_id_fkey"
      FOREIGN KEY ("process_step_id") REFERENCES "public"."activity_process_steps"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Canceling the remainder of a chain, and the conversion cleanup AHS rely on,
-- both filter open rows by entity. Partial because cancellation only ever
-- concerns work that has not happened yet.
CREATE INDEX IF NOT EXISTS "follow_ups_open_by_entity_idx"
    ON "public"."follow_ups" ("organization_id", "entity_type", "entity_id")
    WHERE "completed_at" IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Everyone in the org reads, write roles change. Deletes stop at admin,
-- because deleting a process silently orphans work that references it.

ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_processes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_process_steps" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  write_roles text := 'ARRAY[''platform_owner''::text, ''platform_admin''::text, ''tenant_owner''::text, ''admin''::text, ''estimator''::text]';
  delete_roles text := 'ARRAY[''platform_owner''::text, ''platform_admin''::text, ''tenant_owner''::text, ''admin''::text]';
BEGIN
  FOREACH t IN ARRAY ARRAY['email_templates', 'activity_processes', 'activity_process_steps'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (organization_id = public.get_user_organization_id())',
      t || '_select_org', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s))',
      t || '_insert_write_roles', t, write_roles);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s)) WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s))',
      t || '_update_write_roles', t, write_roles, write_roles);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s))',
      t || '_delete_write_roles', t, delete_roles);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER "set_email_templates_updated_at"
    BEFORE UPDATE ON "public"."email_templates"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_activity_processes_updated_at"
    BEFORE UPDATE ON "public"."activity_processes"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_activity_process_steps_updated_at"
    BEFORE UPDATE ON "public"."activity_process_steps"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- ---------------------------------------------------------------------------
-- Keep a step inside its own tenant
-- ---------------------------------------------------------------------------
-- organization_id is denormalized onto steps so RLS is a plain column check
-- rather than a join. That is only safe if it always matches the parent
-- process, so enforce it rather than trusting callers.

CREATE OR REPLACE FUNCTION "public"."enforce_process_step_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  parent_org uuid;
BEGIN
  SELECT organization_id INTO parent_org
  FROM public.activity_processes
  WHERE id = NEW.process_id;

  IF parent_org IS NULL THEN
    RAISE EXCEPTION 'Process % does not exist', NEW.process_id;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM parent_org THEN
    RAISE EXCEPTION 'Step organization % does not match its process organization %',
      NEW.organization_id, parent_org;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."enforce_process_step_org"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "activity_process_steps_org_guard"
    BEFORE INSERT OR UPDATE ON "public"."activity_process_steps"
    FOR EACH ROW EXECUTE FUNCTION "public"."enforce_process_step_org"();
