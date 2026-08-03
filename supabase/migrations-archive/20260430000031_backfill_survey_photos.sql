-- Migration: backfill survey_photos from site_surveys.photo_metadata
--
-- Walks every survey's JSONB photo array and inserts one survey_photos
-- row per element. Idempotent — the (site_survey_id, legacy_id) unique
-- index makes ON CONFLICT DO NOTHING safe to rerun.
--
-- The JSONB field names are not 1:1 with the table columns (legacy
-- camelCase vs new snake_case, plus several aliases that accumulated
-- during the forensic-pipeline rollout). The CTE below pulls each
-- field with the correct precedence:
--   • original_path > path                 (forensic > legacy single-path)
--   • captured_at  > timestamp             (EXIF > capture-event time)
--   • captured_lat/lng > gpsCoordinates    (forensic > legacy)
--   • mediaType    > 'image'               (default for legacy rows)
--
-- Storage bytes are NOT moved here — that's the migrate-to-r2 script.
-- We only populate original_supabase_path / stamped_supabase_path so
-- render code knows where the bytes still live in the meantime.

WITH unwound AS (
  SELECT
    s.id            AS site_survey_id,
    s.organization_id,
    s.customer_id,
    cust.company_id AS customer_company_id,
    -- Most recent job created from this survey, if any.
    (
      SELECT j.id
        FROM jobs j
       WHERE j.site_survey_id = s.id
       ORDER BY j.created_at DESC
       LIMIT 1
    ) AS job_id,
    org.photo_retention_days,
    photo
  FROM site_surveys s
  JOIN organizations org ON org.id = s.organization_id
  LEFT JOIN customers cust ON cust.id = s.customer_id
  CROSS JOIN LATERAL jsonb_array_elements(s.photo_metadata) AS photo
  WHERE s.photo_metadata IS NOT NULL
    AND jsonb_typeof(s.photo_metadata) = 'array'
    AND jsonb_array_length(s.photo_metadata) > 0
)
INSERT INTO survey_photos (
  organization_id,
  site_survey_id,
  job_id,
  customer_id,
  company_id,
  legacy_id,
  category,
  location,
  caption,
  area_id,
  captured_at,
  captured_at_source,
  captured_lat,
  captured_lng,
  device_make,
  device_model,
  exif_raw,
  media_type,
  mime_type,
  file_size,
  file_hash,
  original_supabase_path,
  stamped_supabase_path,
  tier,
  expires_at,
  stamp_status,
  stamp_error,
  created_at
)
SELECT
  organization_id,
  site_survey_id,
  job_id,
  customer_id,
  customer_company_id,
  NULLIF(photo->>'id', ''),
  COALESCE(NULLIF(photo->>'category', ''), 'other'),
  NULLIF(photo->>'location', ''),
  NULLIF(photo->>'caption', ''),
  NULLIF(photo->>'area_id', ''),

  -- captured_at: EXIF wins, then the legacy capture timestamp.
  COALESCE(
    (NULLIF(photo->>'captured_at', ''))::TIMESTAMPTZ,
    (NULLIF(photo->>'timestamp', ''))::TIMESTAMPTZ
  ),
  -- We don't know the source for legacy rows; tag everything that
  -- doesn't carry forensic fields as 'client' (mobile capture wrote
  -- a device-clock timestamp into the JSONB) and forensic rows as
  -- 'exif' when captured_at was populated by the new pipeline.
  CASE
    WHEN photo ? 'captured_at' AND photo->>'captured_at' IS NOT NULL THEN 'exif'
    WHEN photo ? 'timestamp' THEN 'client'
    ELSE NULL
  END,

  -- GPS: forensic captured_lat/lng > legacy gpsCoordinates.
  COALESCE(
    (NULLIF(photo->>'captured_lat', ''))::DOUBLE PRECISION,
    (NULLIF(photo#>>'{gpsCoordinates,latitude}', ''))::DOUBLE PRECISION
  ),
  COALESCE(
    (NULLIF(photo->>'captured_lng', ''))::DOUBLE PRECISION,
    (NULLIF(photo#>>'{gpsCoordinates,longitude}', ''))::DOUBLE PRECISION
  ),
  NULLIF(photo->>'device_make', ''),
  NULLIF(photo->>'device_model', ''),
  CASE
    WHEN jsonb_typeof(photo->'exif_raw') = 'object' THEN photo->'exif_raw'
    ELSE NULL
  END,

  COALESCE(NULLIF(photo->>'mediaType', ''), 'image'),
  NULLIF(photo->>'mimeType', ''),
  (NULLIF(photo->>'fileSize', ''))::BIGINT,
  NULLIF(photo->>'file_hash', ''),

  -- Storage paths. Forensic rows have original_path + stamped_path;
  -- pre-pipeline rows only have a single `path` field that points at
  -- whatever lives in the legacy survey-photos bucket.
  COALESCE(NULLIF(photo->>'original_path', ''), NULLIF(photo->>'path', '')),
  NULLIF(photo->>'stamped_path', ''),

  'hot',
  -- expires_at uses the survey's photo_metadata-event time as the
  -- anchor when present; otherwise now(). Legacy rows captured
  -- months ago thus get a correct retention countdown rather than a
  -- fresh 3-year window.
  COALESCE(
    (NULLIF(photo->>'timestamp', ''))::TIMESTAMPTZ,
    now()
  ) + (photo_retention_days || ' days')::INTERVAL,

  COALESCE(NULLIF(photo->>'stamp_status', ''), 'pending'),
  NULLIF(photo->>'stamp_error', ''),
  COALESCE(
    (NULLIF(photo->>'timestamp', ''))::TIMESTAMPTZ,
    now()
  )
FROM unwound
WHERE
  -- Skip rows with no usable storage reference — there's nothing for
  -- the render layer or the migrate-to-r2 script to do with them.
  COALESCE(
    NULLIF(photo->>'original_path', ''),
    NULLIF(photo->>'path', '')
  ) IS NOT NULL
ON CONFLICT (site_survey_id, legacy_id) WHERE legacy_id IS NOT NULL
DO NOTHING;
