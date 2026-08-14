-- Business hours for scheduling time pickers.
--
-- Every time dropdown in the app listed all 96 quarter-hours starting at
-- midnight, so booking a 9 AM survey meant scrolling past the entire night
-- first. These two columns bound the list to the hours the company actually
-- works.
--
-- Per-organization rather than a constant because the range is a real
-- business fact that differs by company: a 6 AM–7 PM abatement crew and a
-- 24-hour emergency response outfit want different lists. Defaults match the
-- most common shape for residential abatement.
--
-- Scheduling pickers only. SMS quiet hours and building occupied-hours still
-- offer the full 24 hours, since those legitimately fall outside the workday.

ALTER TABLE "public"."organizations"
  ADD COLUMN IF NOT EXISTS "business_hours_start" time without time zone NOT NULL DEFAULT '06:00:00',
  ADD COLUMN IF NOT EXISTS "business_hours_end" time without time zone NOT NULL DEFAULT '19:00:00';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "pg_constraint" WHERE "conname" = 'organizations_business_hours_order'
  ) THEN
    ALTER TABLE "public"."organizations"
      ADD CONSTRAINT "organizations_business_hours_order"
      CHECK ("business_hours_end" > "business_hours_start");
  END IF;
END $$;

COMMENT ON COLUMN "public"."organizations"."business_hours_start" IS
  'Earliest time offered in scheduling time pickers. Does not restrict what can be stored: existing out-of-range times stay selectable on the record that holds them.';

COMMENT ON COLUMN "public"."organizations"."business_hours_end" IS
  'Latest time offered in scheduling time pickers.';
