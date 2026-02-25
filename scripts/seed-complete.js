/**
 * Complete seed script for Acme Remediation test org
 * Seeds: pricing config, catalogs, estimates, line items, jobs, crew, surveys fix
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Known IDs from existing data
const ORG_ID = '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f';
const SARAH_ID = '779b9c19-ab7c-4591-9dd8-b35b99a57e7b'; // estimator
const JAKE_ID = '6c7f1cb9-11a2-492d-ab57-5a6bb1d0f7e4';  // technician

const CUSTOMERS = {
  garcia: 'ca053cb7-9ed9-4856-891c-9e199f5589f6',
  richardson: '7d1b5865-e297-42cc-9d4d-1e28abc40588',
  denver_school: 'f7abd82e-30de-4fee-a42f-8f345c8d7c12',
  wong: '42e29a9a-5264-4aba-ab33-891204565f01',
  mvhoa: '7adfd1fd-6341-4d7a-ba34-80b4cd1f6c56',
};

const SURVEYS = {
  elm: '19558191-cd34-43db-ad3f-67a51634c56f',       // completed
  oak: 'ee68c5f9-dc81-42b5-98d8-7cc46764072b',       // estimated
  holly: '781c5843-66b5-4924-b2ae-e4acc766ea97',     // submitted
  pine: '9505733c-a62d-47c5-954b-cd1c608c5517',      // draft
};

async function insert(table, data, label) {
  const { data: result, error } = await supabase.from(table).insert(data).select();
  if (error) {
    console.error(`  [FAIL] ${label}: ${error.message}`);
    return null;
  }
  console.log(`  [OK] ${label}: ${Array.isArray(result) ? result.length : 1} rows`);
  return result;
}

async function update(table, filter, data, label) {
  let q = supabase.from(table).update(data);
  for (const [key, val] of Object.entries(filter)) {
    q = q.eq(key, val);
  }
  const { error } = await q;
  if (error) {
    console.error(`  [FAIL] ${label}: ${error.message}`);
  } else {
    console.log(`  [OK] ${label}`);
  }
}

async function main() {
  console.log('=== SEEDING ACME REMEDIATION ===\n');

  // ============================================================
  // 1. Fix surveys — link to customers
  // ============================================================
  console.log('1. Linking surveys to customers...');
  await update('site_surveys', { id: SURVEYS.elm }, { customer_id: CUSTOMERS.garcia }, 'Elm St → Maria Garcia');
  await update('site_surveys', { id: SURVEYS.oak }, { customer_id: CUSTOMERS.richardson }, 'Oak Ave → Tom Richardson');
  await update('site_surveys', { id: SURVEYS.holly }, { customer_id: CUSTOMERS.denver_school }, 'Holly St → Denver School District');
  await update('site_surveys', { id: SURVEYS.pine }, { customer_id: CUSTOMERS.wong }, 'Pine Rd → Lisa Wong');

  // ============================================================
  // 2. Pricing settings
  // ============================================================
  console.log('\n2. Seeding pricing settings...');
  await insert('pricing_settings', {
    organization_id: ORG_ID,
    default_markup_percent: 30.00,
    minimum_markup_percent: 15.00,
    maximum_markup_percent: 50.00,
    office_address_line1: '123 Industrial Blvd',
    office_city: 'Denver',
    office_state: 'CO',
    office_zip: '80202',
    office_lat: 39.7392,
    office_lng: -104.9903,
  }, 'Pricing settings');

  // ============================================================
  // 3. Labor rates
  // ============================================================
  console.log('\n3. Seeding labor rates...');
  await insert('labor_rates', [
    { organization_id: ORG_ID, name: 'Project Supervisor', rate_per_hour: 85.00, description: 'Licensed supervisor/foreman', is_default: false },
    { organization_id: ORG_ID, name: 'Certified Abatement Worker', rate_per_hour: 55.00, description: 'EPA/state-certified remediation technician', is_default: true },
    { organization_id: ORG_ID, name: 'General Laborer', rate_per_hour: 35.00, description: 'Support labor for containment and cleanup', is_default: false },
    { organization_id: ORG_ID, name: 'Air Monitoring Technician', rate_per_hour: 75.00, description: 'Phase contrast/TEM air sampling tech', is_default: false },
  ], 'Labor rates');

  // ============================================================
  // 4. Equipment rates
  // ============================================================
  console.log('\n4. Seeding equipment rates...');
  await insert('equipment_rates', [
    { organization_id: ORG_ID, name: 'Negative Air Machine (2000 CFM)', rate_per_day: 150.00, description: 'HEPA-filtered negative air unit' },
    { organization_id: ORG_ID, name: 'HEPA Vacuum', rate_per_day: 75.00, description: 'Industrial HEPA vacuum cleaner' },
    { organization_id: ORG_ID, name: 'Decontamination Unit', rate_per_day: 200.00, description: '3-stage decontamination shower unit' },
    { organization_id: ORG_ID, name: 'Scaffolding (per section)', rate_per_day: 45.00, description: 'Standard scaffolding section 5x7' },
    { organization_id: ORG_ID, name: 'Air Sampling Pump', rate_per_day: 50.00, description: 'Personal and area air sampling pump' },
  ], 'Equipment rates');

  // ============================================================
  // 5. Material costs
  // ============================================================
  console.log('\n5. Seeding material costs...');
  await insert('material_costs', [
    { organization_id: ORG_ID, name: '6-mil Poly Sheeting', cost_per_unit: 85.00, unit: 'roll', description: '20x100ft roll of 6-mil polyethylene' },
    { organization_id: ORG_ID, name: 'Duct Tape (industrial)', cost_per_unit: 12.00, unit: 'roll', description: '3-inch industrial duct tape' },
    { organization_id: ORG_ID, name: 'Disposable Coveralls (Tyvek)', cost_per_unit: 8.50, unit: 'each', description: 'Full-body disposable coverall with hood' },
    { organization_id: ORG_ID, name: 'Half-face Respirator w/ P100', cost_per_unit: 35.00, unit: 'each', description: 'Reusable half-face respirator with P100 filters' },
    { organization_id: ORG_ID, name: 'HEPA Filter Bag', cost_per_unit: 25.00, unit: 'each', description: 'Replacement HEPA filter for vacuum' },
    { organization_id: ORG_ID, name: 'Amended Water Sprayer', cost_per_unit: 15.00, unit: 'gallon', description: 'Surfactant-amended water for wetting' },
    { organization_id: ORG_ID, name: 'Warning Signs/Labels', cost_per_unit: 5.00, unit: 'each', description: 'OSHA-compliant hazard warning signage' },
    { organization_id: ORG_ID, name: 'Glove Bags (large)', cost_per_unit: 18.00, unit: 'each', description: 'Large glove bags for pipe insulation removal' },
  ], 'Material costs');

  // ============================================================
  // 6. Disposal fees
  // ============================================================
  console.log('\n6. Seeding disposal fees...');
  await insert('disposal_fees', [
    { organization_id: ORG_ID, hazard_type: 'asbestos_friable', cost_per_cubic_yard: 350.00, description: 'Friable asbestos disposal at licensed facility' },
    { organization_id: ORG_ID, hazard_type: 'asbestos_non_friable', cost_per_cubic_yard: 200.00, description: 'Non-friable asbestos (floor tile, transite) disposal' },
    { organization_id: ORG_ID, hazard_type: 'mold', cost_per_cubic_yard: 150.00, description: 'Mold-contaminated material disposal' },
    { organization_id: ORG_ID, hazard_type: 'lead', cost_per_cubic_yard: 275.00, description: 'Lead paint debris disposal' },
  ], 'Disposal fees');

  // ============================================================
  // 7. Travel rates
  // ============================================================
  console.log('\n7. Seeding travel rates...');
  await insert('travel_rates', [
    { organization_id: ORG_ID, min_miles: 0, max_miles: 25, flat_fee: 0.00, per_mile_rate: null },
    { organization_id: ORG_ID, min_miles: 26, max_miles: 50, flat_fee: null, per_mile_rate: 1.25 },
    { organization_id: ORG_ID, min_miles: 51, max_miles: 100, flat_fee: null, per_mile_rate: 1.50 },
    { organization_id: ORG_ID, min_miles: 101, max_miles: null, flat_fee: null, per_mile_rate: 1.75 },
  ], 'Travel rates');

  // ============================================================
  // 8. Equipment catalog
  // ============================================================
  console.log('\n8. Seeding equipment catalog...');
  await insert('equipment_catalog', [
    { organization_id: ORG_ID, name: 'Negative Air Machine 2000', category: 'Air Filtration', daily_rate: 150.00, description: '2000 CFM HEPA-filtered negative air unit' },
    { organization_id: ORG_ID, name: 'HEPA Vacuum (Pullman)', category: 'Cleaning', daily_rate: 75.00, description: 'Pullman-Holt HEPA vacuum' },
    { organization_id: ORG_ID, name: 'Decon Shower Unit', category: 'Decontamination', daily_rate: 200.00, description: '3-stage decontamination shower trailer' },
    { organization_id: ORG_ID, name: 'Personal Air Pump', category: 'Monitoring', daily_rate: 50.00, description: 'SKC personal air sampling pump' },
    { organization_id: ORG_ID, name: 'Scissor Lift (26ft)', category: 'Access', daily_rate: 350.00, description: '26-foot electric scissor lift' },
    { organization_id: ORG_ID, name: 'Pressure Washer (3000 PSI)', category: 'Cleaning', daily_rate: 125.00, description: 'Hot water pressure washer for decontamination' },
  ], 'Equipment catalog');

  // ============================================================
  // 9. Materials catalog
  // ============================================================
  console.log('\n9. Seeding materials catalog...');
  await insert('materials_catalog', [
    { organization_id: ORG_ID, name: '6-mil Poly Sheeting (20x100)', category: 'Containment', unit: 'roll', unit_cost: 85.00, description: 'Polyethylene sheeting for containment barriers' },
    { organization_id: ORG_ID, name: 'Tyvek Coveralls', category: 'PPE', unit: 'each', unit_cost: 8.50, description: 'DuPont Tyvek disposable coveralls w/ hood' },
    { organization_id: ORG_ID, name: 'P100 Respirator', category: 'PPE', unit: 'each', unit_cost: 35.00, description: '3M half-face respirator with P100 cartridges' },
    { organization_id: ORG_ID, name: 'Asbestos Disposal Bags (6-mil)', category: 'Disposal', unit: 'each', unit_cost: 4.50, description: 'Labeled 6-mil asbestos waste bags 33x50' },
    { organization_id: ORG_ID, name: 'Encapsulant (Fiberlock)', category: 'Encapsulation', unit: 'gallon', unit_cost: 45.00, description: 'Bridging encapsulant for remaining ACM' },
    { organization_id: ORG_ID, name: 'HEPA Filter (replacement)', category: 'Filtration', unit: 'each', unit_cost: 65.00, description: 'HEPA filter for negative air machine' },
    { organization_id: ORG_ID, name: 'Duct Tape (3")', category: 'Containment', unit: 'roll', unit_cost: 12.00, description: 'Industrial 3-inch duct tape' },
    { organization_id: ORG_ID, name: 'Spray Adhesive', category: 'Containment', unit: 'can', unit_cost: 14.00, description: 'High-tack spray adhesive for poly seams' },
  ], 'Materials catalog');

  // ============================================================
  // 10. Estimates (new schema)
  // ============================================================
  console.log('\n10. Seeding estimates...');
  const estimates = await insert('estimates', [
    {
      organization_id: ORG_ID,
      site_survey_id: SURVEYS.elm,
      customer_id: CUSTOMERS.garcia,
      estimate_number: 'ACM-00001',
      version: 1,
      status: 'accepted',
      subtotal: 8200.00,
      markup_percent: 30.00,
      markup_amount: 2460.00,
      tax_percent: 0,
      tax_amount: 0,
      total: 10660.00,
      project_name: 'Garcia Property - Basement Pipe Insulation Removal',
      scope_of_work: 'Removal of asbestos-containing pipe insulation in basement utility area. Approximately 120 linear feet of pipe wrap. Full containment with negative air. 3-day estimated duration.',
      estimated_duration_days: 3,
      estimated_start_date: '2026-02-10',
      estimated_end_date: '2026-02-12',
      valid_until: '2026-03-15',
      created_by: SARAH_ID,
    },
    {
      organization_id: ORG_ID,
      site_survey_id: SURVEYS.oak,
      customer_id: CUSTOMERS.richardson,
      estimate_number: 'ACM-00002',
      version: 1,
      status: 'sent',
      subtotal: 3200.00,
      markup_percent: 30.00,
      markup_amount: 960.00,
      tax_percent: 0,
      tax_amount: 0,
      total: 4160.00,
      project_name: 'Richardson Construction - Floor Tile Abatement',
      scope_of_work: 'Removal of vinyl asbestos floor tile (VAT) in 800 sqft commercial space. Non-friable removal with wet methods. Mastic removal and substrate prep.',
      estimated_duration_days: 2,
      estimated_start_date: '2026-03-01',
      estimated_end_date: '2026-03-02',
      valid_until: '2026-04-01',
      created_by: SARAH_ID,
    },
    {
      organization_id: ORG_ID,
      site_survey_id: SURVEYS.holly,
      customer_id: CUSTOMERS.denver_school,
      estimate_number: 'ACM-00003',
      version: 1,
      status: 'draft',
      subtotal: 18500.00,
      markup_percent: 25.00,
      markup_amount: 4625.00,
      tax_percent: 0,
      tax_amount: 0,
      total: 23125.00,
      project_name: 'Denver School District - Boiler Room Abatement',
      scope_of_work: 'Full abatement of asbestos-containing materials in school boiler room including pipe insulation, boiler jacket, and ceiling plaster. Summer schedule required. CDPHE 10-day notification.',
      estimated_duration_days: 10,
      estimated_start_date: '2026-06-15',
      estimated_end_date: '2026-06-26',
      valid_until: '2026-05-01',
      internal_notes: 'Large project — will need full crew. Check CDPHE notification timeline.',
      created_by: SARAH_ID,
    },
  ], 'Estimates');

  if (!estimates) return;

  // ============================================================
  // 11. Estimate line items
  // ============================================================
  console.log('\n11. Seeding estimate line items...');

  // Garcia estimate line items
  await insert('estimate_line_items', [
    { estimate_id: estimates[0].id, item_type: 'labor', category: 'supervisor', description: 'Project Supervisor (3 days x 8 hrs)', quantity: 24, unit: 'hour', unit_price: 85.00, total_price: 2040.00, sort_order: 1 },
    { estimate_id: estimates[0].id, item_type: 'labor', category: 'worker', description: 'Certified Abatement Worker x2 (3 days x 8 hrs)', quantity: 48, unit: 'hour', unit_price: 55.00, total_price: 2640.00, sort_order: 2 },
    { estimate_id: estimates[0].id, item_type: 'equipment', description: 'Negative Air Machine (3 days)', quantity: 3, unit: 'day', unit_price: 150.00, total_price: 450.00, sort_order: 3 },
    { estimate_id: estimates[0].id, item_type: 'equipment', description: 'HEPA Vacuum (3 days)', quantity: 3, unit: 'day', unit_price: 75.00, total_price: 225.00, sort_order: 4 },
    { estimate_id: estimates[0].id, item_type: 'equipment', description: 'Decon Unit (3 days)', quantity: 3, unit: 'day', unit_price: 200.00, total_price: 600.00, sort_order: 5 },
    { estimate_id: estimates[0].id, item_type: 'material', description: 'Poly sheeting, duct tape, PPE, misc supplies', quantity: 1, unit: 'lot', unit_price: 450.00, total_price: 450.00, sort_order: 6 },
    { estimate_id: estimates[0].id, item_type: 'disposal', description: 'Friable asbestos disposal (5 CY)', quantity: 5, unit: 'cubic yard', unit_price: 350.00, total_price: 1750.00, sort_order: 7 },
    { estimate_id: estimates[0].id, item_type: 'testing', description: 'Final air clearance testing (3 areas)', quantity: 3, unit: 'each', unit_price: 150.00, total_price: 450.00, sort_order: 8, is_optional: false },
  ], 'Garcia estimate line items');

  // Richardson estimate line items
  await insert('estimate_line_items', [
    { estimate_id: estimates[1].id, item_type: 'labor', category: 'worker', description: 'Certified Worker x2 (2 days x 8 hrs)', quantity: 32, unit: 'hour', unit_price: 55.00, total_price: 1760.00, sort_order: 1 },
    { estimate_id: estimates[1].id, item_type: 'equipment', description: 'HEPA Vacuum (2 days)', quantity: 2, unit: 'day', unit_price: 75.00, total_price: 150.00, sort_order: 2 },
    { estimate_id: estimates[1].id, item_type: 'material', description: 'PPE, amended water, signage', quantity: 1, unit: 'lot', unit_price: 200.00, total_price: 200.00, sort_order: 3 },
    { estimate_id: estimates[1].id, item_type: 'disposal', description: 'Non-friable asbestos disposal (4 CY)', quantity: 4, unit: 'cubic yard', unit_price: 200.00, total_price: 800.00, sort_order: 4 },
    { estimate_id: estimates[1].id, item_type: 'testing', description: 'Post-removal inspection', quantity: 1, unit: 'each', unit_price: 150.00, total_price: 150.00, sort_order: 5 },
    { estimate_id: estimates[1].id, item_type: 'travel', description: 'Site travel (40 miles round trip)', quantity: 2, unit: 'trip', unit_price: 50.00, total_price: 100.00, sort_order: 6, is_optional: true },
  ], 'Richardson estimate line items');

  // Denver School estimate line items
  await insert('estimate_line_items', [
    { estimate_id: estimates[2].id, item_type: 'labor', category: 'supervisor', description: 'Project Supervisor (10 days x 8 hrs)', quantity: 80, unit: 'hour', unit_price: 85.00, total_price: 6800.00, sort_order: 1 },
    { estimate_id: estimates[2].id, item_type: 'labor', category: 'worker', description: 'Certified Workers x3 (10 days x 8 hrs)', quantity: 240, unit: 'hour', unit_price: 55.00, total_price: 13200.00, sort_order: 2, is_optional: false },
    { estimate_id: estimates[2].id, item_type: 'labor', category: 'monitoring', description: 'Air Monitoring Tech (10 days x 4 hrs)', quantity: 40, unit: 'hour', unit_price: 75.00, total_price: 3000.00, sort_order: 3 },
    { estimate_id: estimates[2].id, item_type: 'equipment', description: 'Negative Air Machines x3 (10 days)', quantity: 30, unit: 'day', unit_price: 150.00, total_price: 4500.00, sort_order: 4 },
    { estimate_id: estimates[2].id, item_type: 'equipment', description: 'Decon Unit + HEPA Vacuums (10 days)', quantity: 10, unit: 'day', unit_price: 275.00, total_price: 2750.00, sort_order: 5 },
    { estimate_id: estimates[2].id, item_type: 'material', description: 'Containment materials, PPE, supplies', quantity: 1, unit: 'lot', unit_price: 1800.00, total_price: 1800.00, sort_order: 6 },
    { estimate_id: estimates[2].id, item_type: 'disposal', description: 'Friable asbestos disposal (12 CY)', quantity: 12, unit: 'cubic yard', unit_price: 350.00, total_price: 4200.00, sort_order: 7 },
    { estimate_id: estimates[2].id, item_type: 'testing', description: 'Clearance air testing (6 areas)', quantity: 6, unit: 'each', unit_price: 200.00, total_price: 1200.00, sort_order: 8 },
    { estimate_id: estimates[2].id, item_type: 'permit', description: 'CDPHE notification fee', quantity: 1, unit: 'each', unit_price: 250.00, total_price: 250.00, sort_order: 9 },
  ], 'Denver School estimate line items');

  // ============================================================
  // 12. Jobs (new schema)
  // ============================================================
  console.log('\n12. Seeding jobs...');
  const jobs = await insert('jobs', [
    {
      organization_id: ORG_ID,
      estimate_id: estimates[0].id,
      customer_id: CUSTOMERS.garcia,
      site_survey_id: SURVEYS.elm,
      job_number: 'JOB-2026-0001',
      name: 'Garcia Property - Pipe Insulation Removal',
      status: 'completed',
      hazard_types: ['asbestos_friable'],
      scheduled_start_date: '2026-02-10',
      scheduled_start_time: '07:00',
      scheduled_end_date: '2026-02-12',
      scheduled_end_time: '16:00',
      estimated_duration_hours: 24,
      actual_start_at: '2026-02-10T07:15:00Z',
      actual_end_at: '2026-02-12T15:30:00Z',
      job_address: '456 Elm St',
      job_city: 'Denver',
      job_state: 'CO',
      job_zip: '80220',
      access_notes: 'Side door to basement. Key under mat.',
      contact_onsite_name: 'Maria Garcia',
      contact_onsite_phone: '(303) 555-0201',
      contract_amount: 10660.00,
      final_amount: 10660.00,
      completion_notes: 'All pipe insulation removed successfully. Final air clearance passed. Area cleaned and released.',
      customer_signed_off: true,
      customer_signoff_at: '2026-02-12T16:00:00Z',
      customer_signoff_name: 'Maria Garcia',
      inspection_required: true,
      inspection_passed: true,
      inspection_date: '2026-02-12',
      inspection_notes: 'All areas below 0.01 f/cc. Clearance passed.',
      created_by: SARAH_ID,
    },
    {
      organization_id: ORG_ID,
      estimate_id: estimates[1].id,
      customer_id: CUSTOMERS.richardson,
      site_survey_id: SURVEYS.oak,
      job_number: 'JOB-2026-0002',
      name: 'Richardson - Floor Tile Abatement',
      status: 'scheduled',
      hazard_types: ['asbestos_non_friable'],
      scheduled_start_date: '2026-03-01',
      scheduled_start_time: '08:00',
      scheduled_end_date: '2026-03-02',
      scheduled_end_time: '17:00',
      estimated_duration_hours: 16,
      job_address: '789 Oak Ave',
      job_city: 'Denver',
      job_state: 'CO',
      job_zip: '80210',
      access_notes: 'Construction site. Check in with site foreman.',
      contact_onsite_name: 'Tom Richardson',
      contact_onsite_phone: '(303) 555-0202',
      contract_amount: 4160.00,
      special_instructions: 'Coordinate with general contractor for site access windows.',
      created_by: SARAH_ID,
    },
    {
      organization_id: ORG_ID,
      estimate_id: estimates[2].id,
      customer_id: CUSTOMERS.denver_school,
      site_survey_id: SURVEYS.holly,
      job_number: 'JOB-2026-0003',
      name: 'DSD - Boiler Room Full Abatement',
      status: 'in_progress',
      hazard_types: ['asbestos_friable', 'lead'],
      scheduled_start_date: '2026-02-20',
      scheduled_start_time: '06:00',
      scheduled_end_date: '2026-03-05',
      scheduled_end_time: '15:00',
      estimated_duration_hours: 80,
      actual_start_at: '2026-02-20T06:30:00Z',
      job_address: '200 S Holly St',
      job_city: 'Denver',
      job_state: 'CO',
      job_zip: '80246',
      access_notes: 'Enter via loading dock. Facilities manager has keys to boiler room.',
      gate_code: '4521',
      contact_onsite_name: 'Jim Torres (Facilities)',
      contact_onsite_phone: '(303) 555-0303',
      contract_amount: 23125.00,
      internal_notes: 'School is on winter break. Must complete before March 10 when classes resume.',
      special_instructions: 'CDPHE notification filed 2/5. Ensure 10-day waiting period observed. All work areas must be cleared by 3/5.',
      inspection_required: true,
      created_by: SARAH_ID,
    },
  ], 'Jobs');

  if (!jobs) return;

  // ============================================================
  // 13. Job crew assignments
  // ============================================================
  console.log('\n13. Seeding job crew...');

  // Completed job — crew with logged hours
  await insert('job_crew', [
    { job_id: jobs[0].id, profile_id: JAKE_ID, role: 'lead', is_lead: true,
      clock_in_at: '2026-02-10T07:15:00Z', clock_out_at: '2026-02-10T16:00:00Z', break_minutes: 30 },
    { job_id: jobs[0].id, profile_id: SARAH_ID, role: 'supervisor', is_lead: false,
      clock_in_at: '2026-02-10T07:00:00Z', clock_out_at: '2026-02-10T12:00:00Z', break_minutes: 0 },
  ], 'Job crew (Garcia completed)');

  // Scheduled job — crew assigned
  await insert('job_crew', [
    { job_id: jobs[1].id, profile_id: JAKE_ID, role: 'lead', is_lead: true },
  ], 'Job crew (Richardson scheduled)');

  // In-progress job — crew with partial hours
  await insert('job_crew', [
    { job_id: jobs[2].id, profile_id: JAKE_ID, role: 'lead', is_lead: true,
      clock_in_at: '2026-02-20T06:30:00Z', clock_out_at: '2026-02-20T15:00:00Z', break_minutes: 30 },
    { job_id: jobs[2].id, profile_id: SARAH_ID, role: 'supervisor', is_lead: false,
      clock_in_at: '2026-02-20T07:00:00Z', clock_out_at: '2026-02-20T14:00:00Z', break_minutes: 30 },
  ], 'Job crew (DSD in progress)');

  // ============================================================
  // 14. Job equipment
  // ============================================================
  console.log('\n14. Seeding job equipment...');
  await insert('job_equipment', [
    { job_id: jobs[0].id, equipment_name: 'Negative Air Machine 2000', equipment_type: 'Air Filtration', quantity: 1, is_rental: false, status: 'returned' },
    { job_id: jobs[0].id, equipment_name: 'HEPA Vacuum', equipment_type: 'Cleaning', quantity: 1, is_rental: false, status: 'returned' },
    { job_id: jobs[2].id, equipment_name: 'Negative Air Machine 2000', equipment_type: 'Air Filtration', quantity: 3, is_rental: false, status: 'deployed' },
    { job_id: jobs[2].id, equipment_name: 'Decon Shower Unit', equipment_type: 'Decontamination', quantity: 1, is_rental: true, rental_rate_daily: 200.00, rental_start_date: '2026-02-20', rental_end_date: '2026-03-05', rental_days: 14, rental_total: 2800.00, status: 'deployed' },
    { job_id: jobs[2].id, equipment_name: 'Scissor Lift (26ft)', equipment_type: 'Access', quantity: 1, is_rental: true, rental_rate_daily: 350.00, rental_start_date: '2026-02-20', rental_end_date: '2026-03-05', rental_days: 14, rental_total: 4900.00, status: 'deployed' },
  ], 'Job equipment');

  // ============================================================
  // 15. Job materials
  // ============================================================
  console.log('\n15. Seeding job materials...');
  await insert('job_materials', [
    { job_id: jobs[0].id, material_name: '6-mil Poly Sheeting', material_type: 'Containment', quantity_estimated: 3, quantity_used: 3, unit: 'roll', unit_cost: 85.00, total_cost: 255.00 },
    { job_id: jobs[0].id, material_name: 'Tyvek Coveralls', material_type: 'PPE', quantity_estimated: 12, quantity_used: 10, unit: 'each', unit_cost: 8.50, total_cost: 85.00 },
    { job_id: jobs[2].id, material_name: '6-mil Poly Sheeting', material_type: 'Containment', quantity_estimated: 10, quantity_used: 6, unit: 'roll', unit_cost: 85.00, total_cost: 510.00, notes: 'In progress — will need more' },
    { job_id: jobs[2].id, material_name: 'Tyvek Coveralls', material_type: 'PPE', quantity_estimated: 40, quantity_used: 15, unit: 'each', unit_cost: 8.50, total_cost: 127.50 },
  ], 'Job materials');

  // ============================================================
  // 16. Job disposal records
  // ============================================================
  console.log('\n16. Seeding job disposal records...');
  await insert('job_disposal', [
    { job_id: jobs[0].id, hazard_type: 'asbestos', disposal_type: 'Friable ACM', quantity: 4.5, unit: 'cubic yard', manifest_number: 'CO-HAZ-2026-00451', manifest_date: '2026-02-12', disposal_facility_name: 'Clean Harbors Denver', disposal_facility_address: '2601 E 50th Ave, Denver, CO 80216', disposal_cost: 1575.00 },
    { job_id: jobs[2].id, hazard_type: 'asbestos', disposal_type: 'Friable ACM', quantity: 3.0, unit: 'cubic yard', manifest_number: 'CO-HAZ-2026-00523', manifest_date: '2026-02-22', disposal_facility_name: 'Clean Harbors Denver', disposal_facility_address: '2601 E 50th Ave, Denver, CO 80216', disposal_cost: 1050.00, notes: 'First load — more to follow' },
  ], 'Job disposal records');

  // ============================================================
  // 17. Job notes
  // ============================================================
  console.log('\n17. Seeding job notes...');
  await insert('job_notes', [
    { job_id: jobs[0].id, note_type: 'general', content: 'Mobilization complete. Containment set up. Negative pressure established at -0.02" WC.', created_by: JAKE_ID },
    { job_id: jobs[0].id, note_type: 'inspection', content: 'Final visual inspection complete. All surfaces clean and free of debris. Air clearance samples collected.', created_by: SARAH_ID },
    { job_id: jobs[0].id, note_type: 'customer_communication', content: 'Called Mrs. Garcia to schedule final walkthrough. She will be available at 4pm on 2/12.', is_internal: false, created_by: SARAH_ID },
    { job_id: jobs[2].id, note_type: 'safety', content: 'Daily air monitoring results within acceptable limits. All personal monitors below PEL.', created_by: JAKE_ID },
    { job_id: jobs[2].id, note_type: 'issue', content: 'Discovered additional ACM behind boiler #3 not identified in survey. May need change order for extended scope.', created_by: JAKE_ID },
    { job_id: jobs[2].id, note_type: 'general', content: 'Day 3 progress: Boiler room A pipe insulation 80% removed. Starting on ceiling plaster tomorrow.', created_by: JAKE_ID },
  ], 'Job notes');

  // ============================================================
  // 18. Update tenant usage
  // ============================================================
  console.log('\n18. Updating tenant usage...');
  await update('tenant_usage', { organization_id: ORG_ID }, {
    assessments_created: 4,
    active_users: 2,
  }, 'Tenant usage');

  // ============================================================
  // 19. Handle orphaned profiles
  // ============================================================
  console.log('\n19. Checking orphaned profiles...');
  // Harry Grips and Hub Songo have no org — these appear to be stale auth test users
  // We'll leave them as-is and just note them
  const { data: orphans } = await supabase.from('profiles')
    .select('id, full_name, role')
    .is('organization_id', null)
    .eq('is_platform_user', false);
  if (orphans && orphans.length > 0) {
    console.log(`  [WARN] ${orphans.length} orphaned profiles (no org, not platform):`);
    orphans.forEach(p => console.log(`    - ${p.full_name} (${p.role})`));
    console.log('  These may be stale test accounts in Supabase Auth.');
  }

  // ============================================================
  // Final summary
  // ============================================================
  console.log('\n=== SEED COMPLETE ===');
  const tables = ['pricing_settings', 'labor_rates', 'equipment_rates', 'material_costs',
    'travel_rates', 'disposal_fees', 'equipment_catalog', 'materials_catalog',
    'estimates', 'estimate_line_items', 'jobs', 'job_crew', 'job_equipment',
    'job_materials', 'job_disposal', 'job_notes'];

  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count} rows`);
  }
}

main().catch(console.error);
