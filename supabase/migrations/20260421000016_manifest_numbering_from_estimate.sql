-- Rebase manifest numbering on the estimate instead of the job.
-- Same street+date pattern, just the prefix changes: EST → MAN. Keeps
-- the three documents (estimate, job, manifest) visibly linked by a
-- shared suffix. Falls back through job number and then street+date
-- when an estimate isn't present.

CREATE OR REPLACE FUNCTION public.generate_manifest_number(
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
  job_number TEXT;
  candidate TEXT;
  suffix INT := 2;
BEGIN
  -- Prefer the estimate's number — EST-1210-4212026 → MAN-1210-4212026.
  SELECT e.estimate_number
    INTO est_number
    FROM public.jobs j
    LEFT JOIN public.estimates e ON e.id = j.estimate_id
    WHERE j.id = p_job_id;

  IF est_number IS NOT NULL AND est_number LIKE 'EST-%' THEN
    base := 'MAN-' || SUBSTRING(est_number FROM 5);
  ELSE
    -- Fall back to the job's suffix if no estimate (edge case).
    SELECT job_number INTO job_number FROM public.jobs WHERE id = p_job_id;
    IF job_number IS NOT NULL AND job_number LIKE 'JOB-%' THEN
      base := 'MAN-' || SUBSTRING(job_number FROM 5);
    ELSE
      -- Last-resort fallback: today's date.
      base := 'MAN-' || TO_CHAR(NOW(), 'MMDDYYYY');
    END IF;
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1 FROM public.manifests
    WHERE organization_id = p_organization_id AND manifest_number = candidate
  ) LOOP
    candidate := base || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;
