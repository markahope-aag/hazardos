-- Storage RLS policies for all buckets
-- Ensures org-scoped access using folder path convention: {org_id}/...

-- ============================================
-- 1. Ensure all buckets exist and are PRIVATE
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-photos', 'survey-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-media', 'assessment-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-photos', 'assessment-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- job-completion-photos already exists and is private (from 20260401000003)

-- ============================================
-- 2. Add missing UPDATE policy to job-completion-photos
-- ============================================

CREATE POLICY "Org-scoped photo updates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'job-completion-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- ============================================
-- 3. survey-photos policies (org-scoped)
--    Path convention: {org_id}/surveys/{survey_id}/{category}/{file}
-- ============================================

CREATE POLICY "survey-photos: org-scoped insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "survey-photos: org-scoped select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "survey-photos: org-scoped update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "survey-photos: org-scoped delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- ============================================
-- 4. assessment-media policies (org-scoped)
--    Path convention: {org_id}/{assessment_id}/{file}
-- ============================================

CREATE POLICY "assessment-media: org-scoped insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assessment-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "assessment-media: org-scoped select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assessment-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "assessment-media: org-scoped update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assessment-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'assessment-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "assessment-media: org-scoped delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assessment-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- ============================================
-- 5. assessment-photos policies (org-scoped)
--    Path convention: {org_id}/{assessment_id}/{file}
-- ============================================

CREATE POLICY "assessment-photos: org-scoped insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "assessment-photos: org-scoped select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "assessment-photos: org-scoped update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "assessment-photos: org-scoped delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );
