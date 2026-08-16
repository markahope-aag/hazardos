-- Collapse the four overlapping SELECT policies on `profiles` into one.
--
-- Postgres OR-together every permissive policy that applies to a statement, so
-- four policies meant four predicates evaluated on every read of this table.
-- `profiles` is not an ordinary table: get_user_organization_id() and
-- get_user_role() both read from it, and those two functions appear in the RLS
-- policy of nearly every other table, so this is the hottest path in the schema.
--
-- What was there:
--   profile_own_select             id = auth.uid()
--   profiles_select_own            id = auth.uid()          <- exact duplicate
--   profile_org_select             organization_id = get_user_organization_id()
--   profile_platform_admin_select  role in (platform_owner, platform_admin)
--
-- The replacement is the OR of those three distinct predicates, so it admits
-- exactly the same rows: your own profile, anyone in your organization, and
-- everything if you are platform staff. One of the four was pure duplication
-- and contributed nothing but work.
--
-- Ordering matters for cost: `id = auth.uid()` is a cheap indexed comparison and
-- is tried first, so the common case of reading your own row short-circuits
-- before either helper function is called.
--
-- INSERT and UPDATE are left alone. They already have exactly one policy each
-- and were never part of the overlap.

DROP POLICY IF EXISTS "profile_own_select" ON "public"."profiles";
DROP POLICY IF EXISTS "profiles_select_own" ON "public"."profiles";
DROP POLICY IF EXISTS "profile_org_select" ON "public"."profiles";
DROP POLICY IF EXISTS "profile_platform_admin_select" ON "public"."profiles";

CREATE POLICY "profiles_select" ON "public"."profiles"
    FOR SELECT
    USING (
        "id" = "auth"."uid"()
        OR "organization_id" = "public"."get_user_organization_id"()
        OR "public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text"])
    );
