-- Objects that live OUTSIDE the public schema, and are therefore NOT captured by
-- 00000000000000_baseline.sql — `supabase db dump` dumps the public schema only.
--
-- Without this file a database rebuilt from the baseline silently loses:
--   * on_auth_user_created  -> signup creates no profiles row, so every new user
--                              has no organisation and no role, and RLS denies
--                              them everything. Onboarding is dead on arrival.
--   * storage buckets       -> uploads have nowhere to land
--   * storage RLS policies  -> org scoping on photos and documents
--
-- This was found by an integration test: a freshly created user could not read
-- its own contact, because handle_new_user() existed as a function but nothing
-- invoked it. Regenerate this file alongside any future re-baseline.

-- ---------------------------------------------------------------------- auth
-- The function itself lives in public and comes from the baseline; only the
-- trigger that fires it lives on auth.users.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('assessment-media',       'assessment-media',       false, 524288000, '{image/*,video/*}'::text[]),
  ('assessment-photos',      'assessment-photos',      false, null,      null),
  ('job-completion-photos',  'job-completion-photos',  false, null,      null),
  ('job-documents',          'job-documents',          false, null,      null),
  ('lab-reports',            'lab-reports',            false, null,      null),
  ('organization-documents', 'organization-documents', false, null,      null),
  ('survey-photos',          'survey-photos',          false, 262144000, '{image/*,video/*}'::text[]),
  ('work-order-documents',   'work-order-documents',   false, null,      null)
on conflict (id) do nothing;

-- ----------------------------------------------------------- storage policies
-- Every bucket is scoped the same way: the first path segment must equal the
-- caller's organization_id. Generated in a loop rather than written out 30-odd
-- times, so the rule can only drift in one place.
do $$
declare
  b text;
  org_scope text;
begin
  foreach b in array array[
    'assessment-media', 'assessment-photos', 'job-documents',
    'lab-reports', 'organization-documents', 'work-order-documents'
  ] loop
    org_scope := format(
      '(bucket_id = %L AND auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = (get_user_organization_id())::text)', b);

    execute format('drop policy if exists %I on storage.objects', b || ': org-scoped select');
    execute format('create policy %I on storage.objects for select using %s', b || ': org-scoped select', org_scope);

    execute format('drop policy if exists %I on storage.objects', b || ': org-scoped insert');
    execute format('create policy %I on storage.objects for insert with check %s', b || ': org-scoped insert', org_scope);

    execute format('drop policy if exists %I on storage.objects', b || ': org-scoped update');
    execute format('create policy %I on storage.objects for update using %s with check %s', b || ': org-scoped update', org_scope, org_scope);

    execute format('drop policy if exists %I on storage.objects', b || ': org-scoped delete');
    execute format('create policy %I on storage.objects for delete using %s', b || ': org-scoped delete', org_scope);
  end loop;

  -- survey-photos gets the same write rules, but its SELECT is split in two so
  -- that untouched originals stay admin-only.
  org_scope := '(bucket_id = ''survey-photos'' AND auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = (get_user_organization_id())::text)';
  execute format('drop policy if exists %I on storage.objects', 'survey-photos: org-scoped insert');
  execute format('create policy %I on storage.objects for insert with check %s', 'survey-photos: org-scoped insert', org_scope);
  execute format('drop policy if exists %I on storage.objects', 'survey-photos: org-scoped update');
  execute format('create policy %I on storage.objects for update using %s with check %s', 'survey-photos: org-scoped update', org_scope, org_scope);
  execute format('drop policy if exists %I on storage.objects', 'survey-photos: org-scoped delete');
  execute format('create policy %I on storage.objects for delete using %s', 'survey-photos: org-scoped delete', org_scope);
end $$;

drop policy if exists "survey-photos: admin select originals" on storage.objects;
create policy "survey-photos: admin select originals" on storage.objects
  for select using (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (get_user_organization_id())::text
    AND (storage.foldername(name))[2] = 'originals'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['platform_owner'::user_role, 'platform_admin'::user_role,
                                       'tenant_owner'::user_role, 'admin'::user_role])
    )
  );

drop policy if exists "survey-photos: org select non-originals" on storage.objects;
create policy "survey-photos: org select non-originals" on storage.objects
  for select using (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (get_user_organization_id())::text
    AND COALESCE((storage.foldername(name))[2], '') <> 'originals'
  );

-- job-completion-photos predates the naming convention above; names preserved so
-- this file reproduces production exactly.
drop policy if exists "Org-scoped photo reads" on storage.objects;
create policy "Org-scoped photo reads" on storage.objects
  for select using (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (get_user_organization_id())::text);

drop policy if exists "Org-scoped photo uploads" on storage.objects;
create policy "Org-scoped photo uploads" on storage.objects
  for insert with check (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (get_user_organization_id())::text);

drop policy if exists "Org-scoped photo updates" on storage.objects;
create policy "Org-scoped photo updates" on storage.objects
  for update using (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (get_user_organization_id())::text)
  with check (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (get_user_organization_id())::text);

drop policy if exists "Org-scoped photo deletes" on storage.objects;
create policy "Org-scoped photo deletes" on storage.objects
  for delete using (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (get_user_organization_id())::text);

-- Legacy assessment-media policies, likewise kept under their original names.
drop policy if exists "Platform owners can access all assessment media" on storage.objects;
create policy "Platform owners can access all assessment media" on storage.objects
  for all using (
    bucket_id = 'assessment-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                AND profiles.role = 'platform_owner'::user_role)
  );

drop policy if exists "Users can view assessment media from their organization folder" on storage.objects;
create policy "Users can view assessment media from their organization folder" on storage.objects
  for select using (
    bucket_id = 'assessment-media'
    AND (storage.foldername(name))[1] IN (
      SELECT (p.organization_id)::text FROM profiles p WHERE p.id = auth.uid()
    )
  );

drop policy if exists "Users can delete assessment media from their organization folde" on storage.objects;
create policy "Users can delete assessment media from their organization folde" on storage.objects
  for delete using (
    bucket_id = 'assessment-media'
    AND (storage.foldername(name))[1] IN (
      SELECT (p.organization_id)::text FROM profiles p WHERE p.id = auth.uid()
    )
  );
