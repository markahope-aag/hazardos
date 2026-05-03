-- ============================================
-- RENAME: manifests → work_orders
-- ============================================
-- "Manifest" was a misnomer in HazardOS terminology — the object is
-- the field crew's job sheet, which the industry calls a Work Order.
-- The standalone EPA "Waste Manifest" (job_disposal.manifest_number /
-- manifest_date / manifest_document_url) is a different document and
-- intentionally NOT renamed by this migration.
--
-- Domain flow after this rename:
--   Survey → Estimate → Job → Work Order → Invoice
--
-- The number prefix moves from MAN- to WO-, so existing rows are
-- rewritten in place. Rest is straight schema renames.

-- 1. Tables
ALTER TABLE manifests RENAME TO work_orders;
ALTER TABLE manifest_vehicles RENAME TO work_order_vehicles;

-- 2. Columns
ALTER TABLE work_orders RENAME COLUMN manifest_number TO work_order_number;
ALTER TABLE work_order_vehicles RENAME COLUMN manifest_id TO work_order_id;

-- 3. Indexes
ALTER INDEX IF EXISTS idx_manifests_org RENAME TO idx_work_orders_org;
ALTER INDEX IF EXISTS idx_manifests_job RENAME TO idx_work_orders_job;
ALTER INDEX IF EXISTS idx_manifests_status RENAME TO idx_work_orders_status;
ALTER INDEX IF EXISTS idx_manifest_vehicles_manifest RENAME TO idx_work_order_vehicles_work_order;

-- 4. UNIQUE constraint (was on (organization_id, manifest_number))
DO $$
DECLARE
  c_name TEXT;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'work_orders'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(organization_id, work_order_number)%';
  IF c_name IS NOT NULL AND c_name LIKE 'manifests%' THEN
    EXECUTE format('ALTER TABLE work_orders RENAME CONSTRAINT %I TO %I',
      c_name, REPLACE(c_name, 'manifests', 'work_orders'));
  END IF;
END
$$;

-- 5. Primary key constraints (auto-named "manifests_pkey", "manifest_vehicles_pkey")
ALTER TABLE work_orders
  RENAME CONSTRAINT manifests_pkey TO work_orders_pkey;
ALTER TABLE work_order_vehicles
  RENAME CONSTRAINT manifest_vehicles_pkey TO work_order_vehicles_pkey;

-- 6. Trigger + trigger function
DROP TRIGGER IF EXISTS manifests_updated_at ON work_orders;
DROP FUNCTION IF EXISTS public.set_manifests_updated_at();

CREATE OR REPLACE FUNCTION public.set_work_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_work_orders_updated_at();

-- 7. RLS policies — drop the old names, recreate with the new names
DROP POLICY IF EXISTS "Users can manage their org manifests" ON work_orders;
CREATE POLICY "Users can manage their org work orders"
  ON work_orders FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can manage manifest vehicles for their org" ON work_order_vehicles;
CREATE POLICY "Users can manage work order vehicles for their org"
  ON work_order_vehicles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM work_orders
    WHERE work_orders.id = work_order_vehicles.work_order_id
      AND work_orders.organization_id = get_user_organization_id()
  ));

-- 8. Numbering function — drop old, create new with WO- prefix.
-- Same precedence as before: estimate suffix > job suffix > today's date.
DROP FUNCTION IF EXISTS public.generate_manifest_number(UUID, UUID);

CREATE OR REPLACE FUNCTION public.generate_work_order_number(
  p_organization_id UUID,
  p_job_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base TEXT;
  est_number TEXT;
  job_num TEXT;
  candidate TEXT;
  suffix INT := 2;
BEGIN
  -- Prefer the estimate's number — EST-1210-4212026 → WO-1210-4212026.
  SELECT e.estimate_number
    INTO est_number
    FROM public.jobs j
    LEFT JOIN public.estimates e ON e.id = j.estimate_id
    WHERE j.id = p_job_id;

  IF est_number IS NOT NULL AND est_number LIKE 'EST-%' THEN
    base := 'WO-' || SUBSTRING(est_number FROM 5);
  ELSE
    SELECT job_number INTO job_num FROM public.jobs WHERE id = p_job_id;
    IF job_num IS NOT NULL AND job_num LIKE 'JOB-%' THEN
      base := 'WO-' || SUBSTRING(job_num FROM 5);
    ELSE
      base := 'WO-' || TO_CHAR(NOW(), 'MMDDYYYY');
    END IF;
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE organization_id = p_organization_id AND work_order_number = candidate
  ) LOOP
    candidate := base || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 9. Rewrite existing identifiers from MAN- to WO- so the user-visible
-- numbers match the new label. Test data only on this DB.
UPDATE work_orders
SET work_order_number = 'WO-' || SUBSTRING(work_order_number FROM 5)
WHERE work_order_number LIKE 'MAN-%';

-- 10. Table comments
COMMENT ON TABLE work_orders IS
  'Crew-facing dispatch sheet for a job (the "work order"). Snapshot is frozen at issue time so the paper version matches what the crew took even if the job is later edited. Distinct from EPA waste manifests stored on job_disposal.';
COMMENT ON TABLE work_order_vehicles IS
  'Vehicles assigned to a work order — trucks, trailers, vans, rentals.';
