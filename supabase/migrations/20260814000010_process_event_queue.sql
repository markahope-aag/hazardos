-- Events that should start a chain, captured where the data changes.
--
-- Context: docs/marketsharp-hazardos-diff.md item P1-2. The rules table already
-- knows about five event types and the trigger editor offers all five, but only
-- activity completion actually raises one. A trigger somebody builds for the
-- other four silently never runs, which is worse than not offering them.
--
-- Why a queue rather than calling the runner from the service layer. Job status
-- and opportunity stage both change from several code paths, and at least one
-- of them is a direct client write. A hook in one service fires most of the
-- time, which is the worst possible reliability for automation: it works when
-- you test it and misses in production without a trace. A database trigger sees
-- every write regardless of which path made it.
--
-- The due-date arithmetic stays in TypeScript where it is tested, so the
-- trigger records what happened and a cron drains the queue through the
-- existing runner. Latency is bounded by the cron interval, which suits chains
-- whose steps are measured in days. Anything needing to be instant should also
-- be emitted directly from its service; runProcess deduplicates, so both
-- happening is harmless.

CREATE TABLE IF NOT EXISTS "public"."process_event_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    -- Qualifier values the rule matcher compares against, e.g.
    -- {"job_status": "completed"} or {"pipeline_stage_id": "..."}.
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    -- Who caused it, so a step assigned to "whoever triggered it" lands on a
    -- person. Null for changes made by a cron or a webhook, which the runner
    -- treats as unassigned rather than dropping.
    "actor_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "process_event_queue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "process_event_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'failed'::"text"]))),
    CONSTRAINT "process_event_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."process_event_queue" OWNER TO "postgres";

-- The drain query: oldest pending first. Partial, because processed rows are
-- kept for a while as an audit trail and will soon outnumber pending ones.
CREATE INDEX IF NOT EXISTS "process_event_queue_pending_idx"
    ON "public"."process_event_queue" ("created_at")
    WHERE "status" = 'pending';

COMMENT ON TABLE "public"."process_event_queue" IS
  'Things that happened which may start an automation chain. Written by database triggers so no write path can bypass them; drained by the process-events cron.';

ALTER TABLE "public"."process_event_queue" ENABLE ROW LEVEL SECURITY;

-- Readable within the tenant for support and debugging. Nothing writes to it
-- through a session: triggers use SECURITY DEFINER and the drain runs on the
-- admin client.
CREATE POLICY "process_event_queue_select_org" ON "public"."process_event_queue"
    FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));

-- ---------------------------------------------------------------------------
-- Job status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."queue_job_status_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.process_event_queue (
    organization_id, event_type, entity_type, entity_id, payload, actor_id
  ) VALUES (
    NEW.organization_id,
    'job_status_changed',
    'job',
    NEW.id,
    jsonb_build_object('job_status', NEW.status),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."queue_job_status_event"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "jobs_queue_status_event"
    AFTER UPDATE OF "status" ON "public"."jobs"
    FOR EACH ROW
    WHEN (OLD."status" IS DISTINCT FROM NEW."status")
    EXECUTE FUNCTION "public"."queue_job_status_event"();

-- ---------------------------------------------------------------------------
-- Opportunity stage
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."queue_opportunity_stage_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.process_event_queue (
    organization_id, event_type, entity_type, entity_id, payload, actor_id
  ) VALUES (
    NEW.organization_id,
    'opportunity_stage_changed',
    'opportunity',
    NEW.id,
    jsonb_build_object('pipeline_stage_id', NEW.stage_id),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."queue_opportunity_stage_event"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "opportunities_queue_stage_event"
    AFTER UPDATE OF "stage_id" ON "public"."opportunities"
    FOR EACH ROW
    WHEN (OLD."stage_id" IS DISTINCT FROM NEW."stage_id")
    EXECUTE FUNCTION "public"."queue_opportunity_stage_event"();

-- ---------------------------------------------------------------------------
-- Lab results
-- ---------------------------------------------------------------------------
-- AHS branch their chains on Sample Positive and Sample Negative by having
-- somebody pick a dropdown value on an appointment. We hold the report, so the
-- report itself can say so.
--
-- Positive means at least one sample came back detected. Read from the samples
-- rather than a summary column, and on two signals: a measured asbestos
-- percentage above zero is unambiguous, while the free-text result field varies
-- by lab ("Detected", "Positive", "Chrysotile detected"). Either one counts,
-- because a false negative here means a chain that should have started did not.

CREATE OR REPLACE FUNCTION "public"."queue_lab_result_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  positive_count integer;
  entity uuid;
BEGIN
  SELECT count(*) INTO positive_count
  FROM public.lab_report_samples
  WHERE lab_report_id = NEW.id
    AND (
      COALESCE(asbestos_pct, 0) > 0
      OR (
        COALESCE(result, '') ILIKE ANY (ARRAY['%detected%', '%positive%'])
        -- "None detected" and "Not detected" are the common negative
        -- phrasings and both contain "detected".
        AND COALESCE(result, '') NOT ILIKE ANY (ARRAY['%none detected%', '%not detected%', '%non-detect%'])
      )
    );

  -- Chains hang off a customer when the report has one; otherwise there is
  -- nothing to attach work to and the event is not worth queuing.
  entity := NEW.customer_id;
  IF entity IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.process_event_queue (
    organization_id, event_type, entity_type, entity_id, payload, actor_id
  ) VALUES (
    NEW.organization_id,
    'lab_result_received',
    'customer',
    entity,
    jsonb_build_object(
      'lab_result', CASE WHEN positive_count > 0 THEN 'positive' ELSE 'negative' END,
      'lab_report_id', NEW.id
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."queue_lab_result_event"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "lab_reports_queue_result_event"
    AFTER UPDATE OF "status" ON "public"."lab_reports"
    FOR EACH ROW
    WHEN (OLD."status" IS DISTINCT FROM NEW."status" AND NEW."status" = 'received')
    EXECUTE FUNCTION "public"."queue_lab_result_event"();
