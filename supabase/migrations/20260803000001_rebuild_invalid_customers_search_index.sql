-- idx_customers_search was left INVALID in production (indisvalid = false), the
-- debris of a CREATE INDEX CONCURRENTLY that failed partway. Postgres will not
-- use an invalid index for scans, but it still maintains it on every write, so
-- contact search has been doing sequential scans while paying the write cost.
--
-- Found by diffing a database rebuilt from 00000000000000_baseline.sql against
-- production: pg_dump skips invalid indexes, so this was the single object the
-- rebuild was "missing".
--
-- Dropped and rebuilt normally (not CONCURRENTLY) so that a failure here is loud
-- and transactional rather than leaving another invalid index behind.

DROP INDEX IF EXISTS public.idx_customers_search;

CREATE INDEX idx_customers_search
  ON public.customers
  USING gin (to_tsvector('english'::regconfig,
    ((name || ' '::text) || COALESCE(company_name, ''::text))));
