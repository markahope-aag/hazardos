-- Survey media: support video alongside photos
--
-- Survey media metadata lives as JSONB on `site_surveys.photo_metadata`
-- (the legacy `site_survey_photos` table exists but is unused), so no
-- schema change is needed to track media type — just widen the storage
-- bucket policy to accept video uploads.
--
-- Previously `survey-photos` had no MIME or size restriction, which
-- meant arbitrary file types could land there and a runaway upload
-- could fill storage. We restrict to image/* and video/* and cap each
-- file at 250 MB.

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY['image/*', 'video/*'],
  file_size_limit    = 262144000  -- 250 MB
WHERE id = 'survey-photos';
