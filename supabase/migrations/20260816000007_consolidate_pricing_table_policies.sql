-- Collapse the overlapping policies on the six pricing configuration tables.
--
-- All six carry an identical trio (verified against production: one distinct
-- policy shape across disposal_fees, equipment_rates, labor_rates,
-- material_costs, travel_rates and pricing_settings):
--
--   "Admins can manage <t> in their organization"  ALL
--       organization_id = get_user_organization_id()
--       AND get_user_role() in (platform_owner, platform_admin, tenant_owner, admin)
--   "Platform owners can access all <t>"           ALL
--       EXISTS (select 1 from profiles where id = auth.uid() and role = 'platform_owner')
--   "Users can view <t> in their organization"     SELECT
--       organization_id = get_user_organization_id()
--
-- Two of those are FOR ALL, so they also apply to SELECT, which is where the
-- overlap comes from: every read evaluated three predicates instead of one.
--
-- Working out what they actually admit:
--   SELECT  = (org AND admin) OR platform_owner OR org
--           = org OR platform_owner            <- the admin clause is redundant
--   INSERT/UPDATE/DELETE = (org AND admin) OR platform_owner
--
-- So the replacement is one policy per action with those exact predicates. No
-- action is covered twice, which is what clears the lint, and nobody gains or
-- loses access.
--
-- Two details that matter:
--   * The old ALL policies had no WITH CHECK. Postgres then reuses USING for the
--     check, so the explicit WITH CHECK below preserves the existing behavior
--     rather than adding a new constraint.
--   * "Platform owners can access all" was an EXISTS subquery on profiles.
--     get_user_role() is the same lookup through the SECURITY DEFINER helper the
--     sibling policies already use, so this is equivalent and one less
--     subquery per row.

DO $$
DECLARE
  t text;
  admin_roles text := $roles$ARRAY['platform_owner','platform_admin','tenant_owner','admin']$roles$;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'disposal_fees', 'equipment_rates', 'labor_rates',
    'material_costs', 'travel_rates', 'pricing_settings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admins can manage ' || t || ' in their organization', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view ' || t || ' in their organization', t);

    -- The platform-owner policy name does not follow the table name closely
    -- enough to rebuild, so drop whatever matches that shape.
    EXECUTE format(
      'DO $inner$ DECLARE p record; BEGIN
         FOR p IN SELECT policyname FROM pg_policies
                  WHERE schemaname = ''public'' AND tablename = %L
                    AND policyname LIKE ''Platform owners can access all%%''
         LOOP EXECUTE format(''DROP POLICY IF EXISTS %%I ON public.%%I'', p.policyname, %L); END LOOP;
       END $inner$', t, t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT
        USING (
          organization_id = public.get_user_organization_id()
          OR public.get_user_role() = 'platform_owner'
        )$f$, t || '_select', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR INSERT
        WITH CHECK (
          (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s))
          OR public.get_user_role() = 'platform_owner'
        )$f$, t || '_insert', t, admin_roles);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR UPDATE
        USING (
          (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s))
          OR public.get_user_role() = 'platform_owner'
        )
        WITH CHECK (
          (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s))
          OR public.get_user_role() = 'platform_owner'
        )$f$, t || '_update', t, admin_roles, admin_roles);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR DELETE
        USING (
          (organization_id = public.get_user_organization_id() AND public.get_user_role() = ANY (%s))
          OR public.get_user_role() = 'platform_owner'
        )$f$, t || '_delete', t, admin_roles);
  END LOOP;
END $$;
