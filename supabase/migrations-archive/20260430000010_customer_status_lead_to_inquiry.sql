-- Rename the customer_status enum value 'lead' -> 'inquiry'.
-- The CRM team prefers "inquiry" as the language for an initial contact;
-- 'lead' was the original term but conflicts with how the rest of the app
-- talks about marketing-source leads (lead_source, lead_webhook_service)
-- and the hazard_type 'lead' for lead paint. Renaming the status value is
-- the cleanest disambiguator.
--
-- ALTER TYPE ... RENAME VALUE preserves all existing column data and
-- index entries — no row updates needed and no downtime risk.

ALTER TYPE customer_status RENAME VALUE 'lead' TO 'inquiry';

-- Update the column default so newly inserted rows that don't specify
-- a status start as 'inquiry'.
ALTER TABLE customers
    ALTER COLUMN status SET DEFAULT 'inquiry';

-- Refresh the column comment so it reflects the new lifecycle.
COMMENT ON COLUMN customers.status IS
    'Customer status: inquiry (initial contact) -> prospect (survey scheduled) -> customer (job completed) -> inactive';
