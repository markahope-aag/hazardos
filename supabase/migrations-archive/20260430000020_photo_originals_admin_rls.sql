-- Forensic photo pipeline: lock original (un-stamped) photos to admins.
--
-- New uploads land at `{orgId}/originals/surveys/...` (untouched bytes,
-- forensic source of truth) and `{orgId}/stamped/surveys/...` (the
-- visible burned-in timestamped derivative). The originals prefix needs
-- a stricter SELECT policy so only admins can read it for legal export
-- — field staff and viewers see only the stamped version.
--
-- Existing photos at `{orgId}/surveys/...` (no prefix) keep their
-- previous org-wide access — only the new `originals/` segment is
-- restricted. Stamped photos at `{orgId}/stamped/surveys/...` continue
-- to fall under the org-wide policy below.
--
-- INSERT/UPDATE/DELETE remain org-scoped: field staff need to write
-- originals during upload; they just can't read them back afterward.

-- Replace the existing org-wide SELECT policy so it excludes the
-- `originals/` prefix from non-admin access. PostgreSQL RLS unions
-- permissive policies, so dropping the old one before adding the new
-- pair is the only way to actually exclude originals.
DROP POLICY IF EXISTS "survey-photos: org-scoped select" ON storage.objects;

CREATE POLICY "survey-photos: org select non-originals"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'survey-photos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = get_user_organization_id()::text
        AND COALESCE((storage.foldername(name))[2], '') <> 'originals'
    );

CREATE POLICY "survey-photos: admin select originals"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'survey-photos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = get_user_organization_id()::text
        AND (storage.foldername(name))[2] = 'originals'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND role IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
        )
    );
