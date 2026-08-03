-- OPP wizard prefill: per-org boilerplate text for the four
-- "Protective Measures" sections of the Occupant Protection Plan.
-- The org sets these once in Settings; the wizard pre-fills them on
-- every new OPP and the user tweaks per-job as needed. Stored as a
-- single JSONB so adding a fifth section later (state variants) is a
-- non-migrating change.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS opp_defaults JSONB
    NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organizations.opp_defaults IS
  'OPP wizard boilerplate. Keys: containment, ventilation, work_practices, final_cleaning.';
