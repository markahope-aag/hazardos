-- Industry events: org-scoped calendar entries for industry association
-- meetings, expos, networking nights, etc. Lives alongside jobs and
-- surveys on the calendar but isn't tied to any specific job — these
-- are the trade events the team networks at to find the next job.

CREATE TABLE industry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Free-text category so orgs can use their own taxonomy ('nari',
  -- 'ahca', 'osha-training', etc). Indexed for filter queries.
  category TEXT NOT NULL DEFAULT 'general',

  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  -- end_at allows multi-day events (Build & Remodel Expo spans 2 days).
  -- Defaults to start_at on insert when the caller doesn't care.
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,

  location TEXT,
  description TEXT,
  registration_url TEXT,

  -- For idempotent imports — e.g. re-running the NARI 2026 seed
  -- shouldn't duplicate events. The (organization_id, source, source_ref)
  -- triple is unique.
  source TEXT,
  source_ref TEXT,

  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_industry_events_org_start
  ON industry_events(organization_id, start_at);
CREATE INDEX idx_industry_events_category
  ON industry_events(organization_id, category);
CREATE UNIQUE INDEX idx_industry_events_source_ref
  ON industry_events(organization_id, source, source_ref)
  WHERE source IS NOT NULL AND source_ref IS NOT NULL;

ALTER TABLE industry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY industry_events_select ON industry_events
  FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY industry_events_insert ON industry_events
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY industry_events_update ON industry_events
  FOR UPDATE USING (organization_id = get_user_organization_id());
CREATE POLICY industry_events_delete ON industry_events
  FOR DELETE USING (organization_id = get_user_organization_id());

CREATE TRIGGER set_updated_at_industry_events
  BEFORE UPDATE ON industry_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- One-shot seeder for NARI of Madison 2026 events. Idempotent via the
-- (org_id, 'nari-madison', 'nari-madison-2026:<n>') natural key — calling
-- twice is a no-op. Used by the settings UI's "Import NARI of Madison
-- 2026" button. All times are America/Chicago since NARI is in WI.
CREATE OR REPLACE FUNCTION import_nari_madison_2026(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  inserted INTEGER;
  cat CONSTANT TEXT := 'nari-madison';
  src CONSTANT TEXT := 'nari-madison-2026';
BEGIN
  -- Verify the caller actually belongs to this org. Avoids letting a
  -- compromised session seed events into someone else's calendar.
  IF p_organization_id <> get_user_organization_id() THEN
    RAISE EXCEPTION 'Cannot seed events for an organization you do not belong to';
  END IF;

  INSERT INTO industry_events (
    organization_id, category, title, start_at, end_at, all_day,
    location, description, registration_url, source, source_ref
  )
  VALUES
    -- Jan 24–25: Build & Remodel Expo (2-day all-weekend event)
    (p_organization_id, cat, 'Build & Remodel Expo',
     '2026-01-24 00:00:00-06', '2026-01-25 23:59:59-06', true,
     'Madison Marriott West Convention Center',
     'All weekend event', 'https://narimadison.org', src, 'expo-jan'),

    -- Feb 16: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-02-16 10:30:00-06', '2026-02-16 13:00:00-06', false,
     'Madison Marriott West',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-feb'),

    -- Mar 1–7: Women in Construction Week (full week)
    (p_organization_id, cat, 'Women in Construction Week',
     '2026-03-01 00:00:00-06', '2026-03-07 23:59:59-06', true,
     NULL, 'Industry awareness week',
     'https://narimadison.org', src, 'wic-week'),

    -- Mar 5: Women in Construction Wisconsin BuildX Conference
    (p_organization_id, cat, 'Women in Construction Wisconsin BuildX Conference',
     '2026-03-05 08:00:00-06', '2026-03-05 17:00:00-06', false,
     'Monona Terrace, Madison', NULL,
     'https://narimadison.org', src, 'buildx'),

    -- Mar 16: General Membership Meeting (dinner)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-03-16 16:30:00-05', '2026-03-16 19:30:00-05', false,
     'Madison Marriott West',
     'Dinner event – 4:30 pm workshop and 5:30 pm dinner',
     'https://narimadison.org', src, 'gmm-mar'),

    -- Apr 9: Trivia Night
    (p_organization_id, cat, 'Trivia Night',
     '2026-04-09 18:00:00-05', '2026-04-09 21:00:00-05', false,
     'Walk Your Plans', 'Evening event',
     'https://narimadison.org', src, 'trivia'),

    -- Apr 20: General Membership Meeting / Networking (lunch, no workshop)
    (p_organization_id, cat, 'General Membership Meeting / Networking Event',
     '2026-04-20 11:30:00-05', '2026-04-20 13:00:00-05', false,
     'Kitchen Ideas Center',
     'Lunch event – No workshop – 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-apr'),

    -- May (whole month): Home Improvement Month
    (p_organization_id, cat, 'Home Improvement Month',
     '2026-05-01 00:00:00-05', '2026-05-31 23:59:59-05', true,
     NULL, 'Industry awareness month',
     'https://narimadison.org', src, 'him-month'),

    -- May 1: Spring Sporting Clay Event (all day)
    (p_organization_id, cat, 'Spring Sporting Clay Event',
     '2026-05-01 08:00:00-05', '2026-05-01 17:00:00-05', false,
     'Milford Hills', 'All day event',
     'https://narimadison.org', src, 'clay-spring'),

    -- May 18: General Membership Meeting (dinner)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-05-18 16:30:00-05', '2026-05-18 19:30:00-05', false,
     'Ferguson Home',
     'Dinner event – 4:30 pm workshop and 5:30 pm dinner',
     'https://narimadison.org', src, 'gmm-may'),

    -- Jun 12: Golf Outing (all day)
    (p_organization_id, cat, 'Golf Outing',
     '2026-06-12 08:00:00-05', '2026-06-12 17:00:00-05', false,
     'The Oaks Golf Course', 'All day event',
     'https://narimadison.org', src, 'golf'),

    -- Jul 20: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-07-20 10:30:00-05', '2026-07-20 13:00:00-05', false,
     'Madison Marriott West',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-jul'),

    -- Aug 17: NARI Networking Night (4–7 pm)
    (p_organization_id, cat, 'NARI Networking Night',
     '2026-08-17 16:00:00-05', '2026-08-17 19:00:00-05', false,
     'Wisconsin Brewing Company', 'Open House 4–7 pm',
     'https://narimadison.org', src, 'networking-night'),

    -- Sep 21: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-09-21 10:30:00-05', '2026-09-21 13:00:00-05', false,
     'Gerhard''s Kitchen & Bath Store',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-sep'),

    -- Sep 25: Fall Sporting Clay Event (all day)
    (p_organization_id, cat, 'Fall Sporting Clay Event',
     '2026-09-25 08:00:00-05', '2026-09-25 17:00:00-05', false,
     'Milford Hills', 'All day event',
     'https://narimadison.org', src, 'clay-fall'),

    -- Oct 8: RotY (Remodeler of the Year) Award Entries Due
    (p_organization_id, cat, 'RotY Award Entries Due',
     '2026-10-08 00:00:00-05', '2026-10-08 23:59:59-05', true,
     NULL, 'Remodeler of the Year award entries due',
     'https://narimadison.org', src, 'roty-due'),

    -- Oct 19: General Membership Meeting (dinner)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-10-19 16:30:00-05', '2026-10-19 19:30:00-05', false,
     'Madison Marriott West',
     'Dinner event – 4:30 pm workshop and 5:30 pm dinner',
     'https://narimadison.org', src, 'gmm-oct'),

    -- Nov 9: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-11-09 10:30:00-06', '2026-11-09 13:00:00-06', false,
     'DoubleTree by Hilton Madison East',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-nov'),

    -- Nov 19: Celebrating Excellence Awards Event
    (p_organization_id, cat, 'Celebrating Excellence Awards Event',
     '2026-11-19 18:00:00-06', '2026-11-19 21:00:00-06', false,
     'Madison Marriott West', 'Evening event',
     'https://narimadison.org', src, 'awards'),

    -- Dec 14: Annual Meeting and Vendor Fair Event
    (p_organization_id, cat, 'Annual Meeting and Vendor Fair',
     '2026-12-14 18:00:00-06', '2026-12-14 21:00:00-06', false,
     'Madison Marriott West', 'Evening event',
     'https://narimadison.org', src, 'annual-meeting')
  ON CONFLICT (organization_id, source, source_ref) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION import_nari_madison_2026(UUID) TO authenticated;

COMMENT ON TABLE industry_events IS
  'Org-scoped industry association events (NARI, AHCA, OSHA training, etc.) shown alongside jobs/surveys on the calendar.';
COMMENT ON FUNCTION import_nari_madison_2026(UUID) IS
  'Idempotent seed: NARI of Madison 2026 calendar (18 events). Callable from authenticated requests for the caller''s own organization only.';
