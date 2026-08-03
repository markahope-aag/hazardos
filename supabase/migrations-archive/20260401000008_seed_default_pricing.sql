-- Seed default pricing data for Acme Remediation organization
-- Idempotent: only inserts if no rows exist for this org in each table

DO $$
DECLARE
  v_org_id uuid := '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f';
BEGIN

  -- pricing_settings (1 row)
  INSERT INTO pricing_settings (organization_id, default_markup_percent, minimum_markup_percent, maximum_markup_percent)
  VALUES (v_org_id, 25, 10, 50)
  ON CONFLICT (organization_id) DO NOTHING;

  -- labor_rates (4 rows) — skip if org already has labor rates
  IF NOT EXISTS (SELECT 1 FROM labor_rates WHERE organization_id = v_org_id) THEN
    INSERT INTO labor_rates (organization_id, name, rate_per_hour, is_default)
    VALUES
      (v_org_id, 'Project Supervisor',   85.00, true),
      (v_org_id, 'Abatement Technician', 55.00, true),
      (v_org_id, 'Lead Technician',      65.00, true),
      (v_org_id, 'Helper/Laborer',       40.00, true);
  END IF;

  -- equipment_rates (10 rows)
  IF NOT EXISTS (SELECT 1 FROM equipment_rates WHERE organization_id = v_org_id) THEN
    INSERT INTO equipment_rates (organization_id, name, rate_per_day)
    VALUES
      (v_org_id, 'HEPA Vacuum',              75.00),
      (v_org_id, 'Negative Air Machine',    150.00),
      (v_org_id, 'Decontamination Unit',    200.00),
      (v_org_id, 'Air Monitoring Equipment', 100.00),
      (v_org_id, 'Air Scrubber',            125.00),
      (v_org_id, 'Dehumidifier',             85.00),
      (v_org_id, 'Moisture Meter',           25.00),
      (v_org_id, 'Lead Test Kit',            50.00),
      (v_org_id, 'Encapsulation Sprayer',    75.00),
      (v_org_id, 'Containment Materials',   100.00);
  END IF;

  -- material_costs (11 rows)
  IF NOT EXISTS (SELECT 1 FROM material_costs WHERE organization_id = v_org_id) THEN
    INSERT INTO material_costs (organization_id, name, cost_per_unit, unit)
    VALUES
      (v_org_id, 'Poly Sheeting (6 mil)',   0.15, 'sqft'),
      (v_org_id, 'Poly Sheeting (4 mil)',   0.10, 'sqft'),
      (v_org_id, 'Duct Tape',              8.00, 'roll'),
      (v_org_id, 'Disposal Bags (6 mil)',   5.00, 'each'),
      (v_org_id, 'Warning Labels',          0.50, 'each'),
      (v_org_id, 'Tyvek Suits',           12.00, 'each'),
      (v_org_id, 'Respirator Filters',    15.00, 'pair'),
      (v_org_id, 'Antimicrobial Solution', 45.00, 'gallon'),
      (v_org_id, 'HEPA Filters',          75.00, 'each'),
      (v_org_id, 'Disposal Bags',          3.50, 'each'),
      (v_org_id, 'Lead Encapsulant',      55.00, 'gallon');
  END IF;

  -- disposal_fees (5 rows)
  IF NOT EXISTS (SELECT 1 FROM disposal_fees WHERE organization_id = v_org_id) THEN
    INSERT INTO disposal_fees (organization_id, hazard_type, cost_per_cubic_yard)
    VALUES
      (v_org_id, 'asbestos_friable',     450.00),
      (v_org_id, 'asbestos_non_friable', 350.00),
      (v_org_id, 'mold',                150.00),
      (v_org_id, 'lead',                350.00),
      (v_org_id, 'other',               100.00);
  END IF;

  -- travel_rates (2 rows)
  IF NOT EXISTS (SELECT 1 FROM travel_rates WHERE organization_id = v_org_id) THEN
    INSERT INTO travel_rates (organization_id, min_miles, max_miles, flat_fee, per_mile_rate)
    VALUES
      (v_org_id,  0,  50, 150.00,  0.00),
      (v_org_id, 50, 150, 150.00,  1.50);
  END IF;

END $$;
