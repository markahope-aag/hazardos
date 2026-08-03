-- Expand work_orders.status from {draft, issued} to the full lifecycle:
--   draft     -- not yet given to crew, editable
--   issued    -- handed off to crew, still editable (in-flight corrections happen)
--   revised   -- changed after issue; crew should re-sync to the latest version
--   completed -- crew finished the work captured by this work order
--   archived  -- off the active list; read-only history
--
-- The previous "issued = locked" model was too rigid — real dispatch
-- often needs in-flight corrections (added vehicle, swapped crew member,
-- new access info), and the office shouldn't have to recreate the work
-- order to reflect that. Editability moves to the API layer instead of
-- being baked into status.

ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS manifests_status_check;

ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_status_check;

ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_status_check
  CHECK (status IN ('draft', 'issued', 'revised', 'completed', 'archived'));
