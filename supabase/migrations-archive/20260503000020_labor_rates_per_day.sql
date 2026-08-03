-- Switch labor_rates from per-hour to per-day pricing.
--
-- Why: HazardOS customers (environmental remediation contractors)
-- price and schedule labor in man-days, never in hours. The smallest
-- billable unit is one 8-hour day. The previous column name and unit
-- forced the UI and estimator to convert at every boundary; renaming
-- to rate_per_day aligns the data model with the domain.
--
-- Existing values are assumed to be hourly (matching the original
-- schema and seed data) and are multiplied by 8 to produce daily
-- equivalents. If any org has already entered a value as a daily rate
-- after this migration is written but before it runs, that org will
-- need a manual fix — but no live customer data exists yet, so this
-- one-shot conversion is safe.

ALTER TABLE labor_rates RENAME COLUMN rate_per_hour TO rate_per_day;

-- Drop the old non-negative CHECK so we can re-add it under the new name.
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.labor_rates'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%rate_per_day%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE labor_rates DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

UPDATE labor_rates SET rate_per_day = rate_per_day * 8;

ALTER TABLE labor_rates
  ADD CONSTRAINT labor_rates_rate_per_day_non_negative
  CHECK (rate_per_day >= 0);
