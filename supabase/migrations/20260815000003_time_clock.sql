-- Technician time clock: clock in/out, generally or per job, with a weekly
-- submit + supervisor approval step before it counts toward payroll.
--
-- Context: docs/client-feedback-2026-07-28.md P4 #18 — "Clock in/out
-- generally and per job, supervisor approval before weekly submission.
-- Would replace paper timesheets and feed payroll." Flagged in that doc as
-- needing two or three passes with Bob given how little downtime he has in
-- the field — this is a first pass, not a finished payroll system. No
-- payroll integration exists yet to feed; that stays a manual export for
-- now.
--
-- Deliberately separate from `job_time_entries`, which is a different,
-- older model: a manual "log N hours against this job" entry used by the
-- job-completion flow, with no clock timestamps, no approval, and always
-- job-scoped. This table is a live clock (clock_in/clock_out timestamps),
-- optionally job-scoped (job_id nullable — a tech can clock in for
-- "general" time: driving, shop work, admin), and carries its own
-- submit/approve lifecycle. The two are not reconciled here; that's a
-- product decision for a later pass, not a migration detail.

CREATE TABLE IF NOT EXISTS "public"."time_clock_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    -- Null means general time — not attributed to a specific job.
    "job_id" "uuid",
    "clock_in" timestamp with time zone NOT NULL,
    "clock_out" timestamp with time zone,
    -- open: clocked in, not yet submitted (whether or not clocked out yet).
    -- submitted: tech submitted the week, awaiting a supervisor.
    -- approved / rejected: supervisor decided.
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "notes" "text",
    "submitted_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "time_clock_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "time_clock_entries_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'submitted'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "time_clock_entries_clock_out_after_in" CHECK ("clock_out" IS NULL OR "clock_out" >= "clock_in"),
    CONSTRAINT "time_clock_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "time_clock_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "time_clock_entries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL,
    CONSTRAINT "time_clock_entries_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."time_clock_entries" OWNER TO "postgres";

-- A technician can only be clocked into one thing at a time. Without this,
-- a double-tap on "Clock In" (a real risk on a phone in a work glove)
-- silently opens a second entry and both run until someone notices the
-- hours are doubled.
CREATE UNIQUE INDEX IF NOT EXISTS "time_clock_entries_one_open_per_profile"
    ON "public"."time_clock_entries" ("profile_id")
    WHERE ("clock_out" IS NULL);

CREATE INDEX IF NOT EXISTS "idx_time_clock_entries_org_profile"
    ON "public"."time_clock_entries" ("organization_id", "profile_id", "clock_in");

CREATE INDEX IF NOT EXISTS "idx_time_clock_entries_status"
    ON "public"."time_clock_entries" ("organization_id", "status");

COMMENT ON TABLE "public"."time_clock_entries" IS
  'Clock in/out entries, optionally scoped to a job. Submitted weekly, approved by a supervisor. See docs/client-feedback-2026-07-28.md P4 #18.';

CREATE OR REPLACE TRIGGER "set_time_clock_entries_updated_at"
    BEFORE UPDATE ON "public"."time_clock_entries"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- A technician manages their own clock (insert, clock themselves out, submit
-- their own week). Approving is an office/admin action, enforced at the API
-- layer (ROLES.TENANT_WRITE) rather than here — RLS still scopes every write
-- to the caller's own organization and, for non-admins, their own rows.

ALTER TABLE "public"."time_clock_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_clock_entries_select_org" ON "public"."time_clock_entries"
    FOR SELECT USING ("organization_id" = "public"."get_user_organization_id"());

CREATE POLICY "time_clock_entries_insert_own" ON "public"."time_clock_entries"
    FOR INSERT WITH CHECK (
        "organization_id" = "public"."get_user_organization_id"()
        AND "profile_id" = "auth"."uid"()
    );

-- Update covers both self-service (clock out, submit) and supervisor review
-- (approve/reject). Distinguishing those is the API's job, not RLS's — this
-- policy is deliberately permissive at the row-security layer and relies on
-- the API route's allowedRoles check for the approve/reject action.
CREATE POLICY "time_clock_entries_update_org" ON "public"."time_clock_entries"
    FOR UPDATE USING ("organization_id" = "public"."get_user_organization_id"())
    WITH CHECK ("organization_id" = "public"."get_user_organization_id"());
