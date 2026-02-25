/**
 * Seed script for test data - matches the ACTUAL database schema
 * Run: node scripts/seed-test-data.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seed() {
  // Check if already seeded
  const { data: existingOrg } = await supabase.from('organizations').select('id').eq('name', 'Acme Remediation').single();
  if (existingOrg) {
    console.log('Acme Remediation already exists (' + existingOrg.id + '). Skipping seed.');
    return;
  }

  // 1. Create organization
  const { data: org, error: orgErr } = await supabase.from('organizations').insert({
    name: 'Acme Remediation',
    address: '123 Industrial Blvd',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
    phone: '(303) 555-0100',
    email: 'info@acmeremediation.com',
    license_number: 'ENV-2024-00123',
    status: 'active',
    subscription_tier: 'professional',
  }).select().single();

  if (orgErr) { console.error('Org error:', orgErr.message); return; }
  console.log('Org created:', org.id, org.name);

  // 2. Create a test technician
  const { data: techAuth, error: techAuthErr } = await supabase.auth.admin.createUser({
    email: 'jake.miller@acmeremediation.com',
    password: 'TestUser123!',
    email_confirm: true,
    user_metadata: { first_name: 'Jake', last_name: 'Miller' }
  });
  if (techAuthErr) { console.error('Tech auth error:', techAuthErr.message); return; }

  await supabase.from('profiles').update({
    organization_id: org.id,
    role: 'technician',
    is_active: true,
  }).eq('id', techAuth.user.id);
  console.log('Technician created:', techAuth.user.id, '(jake.miller@acmeremediation.com)');

  // 3. Create an estimator
  const { data: estAuth, error: estAuthErr } = await supabase.auth.admin.createUser({
    email: 'sarah.chen@acmeremediation.com',
    password: 'TestUser123!',
    email_confirm: true,
    user_metadata: { first_name: 'Sarah', last_name: 'Chen' }
  });
  if (estAuthErr) { console.error('Est auth error:', estAuthErr.message); return; }

  await supabase.from('profiles').update({
    organization_id: org.id,
    role: 'estimator',
    is_active: true,
  }).eq('id', estAuth.user.id);
  console.log('Estimator created:', estAuth.user.id, '(sarah.chen@acmeremediation.com)');

  // 4. Create customers
  const customers = [
    { name: 'Maria Garcia', company_name: 'Garcia Property Management', email: 'maria@garciaprop.com', phone: '(303) 555-0201', address_line1: '456 Elm St', city: 'Denver', state: 'CO', zip: '80203', status: 'customer', source: 'referral' },
    { name: 'Tom Richardson', company_name: 'Richardson Construction', email: 'tom@richardsonconst.com', phone: '(303) 555-0202', address_line1: '789 Oak Ave', city: 'Boulder', state: 'CO', zip: '80301', status: 'customer', source: 'website' },
    { name: 'Denver School District', company_name: 'Denver School District', email: 'facilities@dsd.edu', phone: '(303) 555-0203', address_line1: '1860 Lincoln St', city: 'Denver', state: 'CO', zip: '80203', status: 'customer', source: 'phone' },
    { name: 'Lisa Wong', email: 'lisa.wong@gmail.com', phone: '(720) 555-0204', address_line1: '321 Pine Rd', city: 'Aurora', state: 'CO', zip: '80012', status: 'lead', source: 'website' },
    { name: 'Mountain View HOA', company_name: 'Mountain View HOA', email: 'board@mvhoa.org', phone: '(303) 555-0205', address_line1: '500 Mountain View Dr', city: 'Golden', state: 'CO', zip: '80401', status: 'prospect', source: 'referral' },
  ];

  const { data: custs, error: custErr } = await supabase.from('customers').insert(
    customers.map(c => ({ ...c, organization_id: org.id, created_by: estAuth.user.id }))
  ).select();
  if (custErr) { console.error('Customer error:', custErr.message); return; }
  console.log('Customers created:', custs.length);

  // 5. Create site surveys
  const surveys = [
    { job_name: 'Asbestos Inspection - Garcia Apartments', customer_name: 'Maria Garcia', customer_email: 'maria@garciaprop.com', site_address: '456 Elm St', site_city: 'Denver', site_state: 'CO', site_zip: '80203', hazard_type: 'asbestos', status: 'completed', area_sqft: 2400, building_type: 'Multi-family residential', year_built: 1965, stories: 3 },
    { job_name: 'Mold Assessment - Richardson Office', customer_name: 'Tom Richardson', customer_email: 'tom@richardsonconst.com', site_address: '789 Oak Ave', site_city: 'Boulder', site_state: 'CO', site_zip: '80301', hazard_type: 'mold', status: 'estimated', area_sqft: 800, building_type: 'Commercial office', year_built: 1992, stories: 2 },
    { job_name: 'Lead Paint Survey - Jefferson Elementary', customer_name: 'Denver School District', customer_email: 'facilities@dsd.edu', site_address: '200 S Holly St', site_city: 'Denver', site_state: 'CO', site_zip: '80246', hazard_type: 'lead', status: 'submitted', area_sqft: 12000, building_type: 'School', year_built: 1958, stories: 2 },
    { job_name: 'Vermiculite Check - Wong Residence', customer_name: 'Lisa Wong', customer_email: 'lisa.wong@gmail.com', site_address: '321 Pine Rd', site_city: 'Aurora', site_state: 'CO', site_zip: '80012', hazard_type: 'vermiculite', status: 'draft', area_sqft: 1800, building_type: 'Single-family residential', year_built: 1972, stories: 1 },
  ];

  const { data: survs, error: survErr } = await supabase.from('site_surveys').insert(
    surveys.map(s => ({ ...s, organization_id: org.id, estimator_id: estAuth.user.id }))
  ).select();
  if (survErr) { console.error('Survey error:', survErr.message); return; }
  console.log('Site surveys created:', survs.length);

  // 6. Create estimate (using actual DB schema: old estimates table)
  const survey1 = survs.find(s => s.job_name.includes('Garcia'));
  const { data: est, error: estErr } = await supabase.from('estimates').insert({
    site_survey_id: survey1.id,
    created_by: estAuth.user.id,
    estimated_duration_days: 5,
    estimated_labor_hours: 120,
    crew_type: 'Asbestos Abatement Crew',
    crew_size: 3,
    labor_rate_per_hour: 43.75,
    equipment_needed: JSON.stringify([
      { name: 'HEPA Vacuums', qty: 2, cost: 150 },
      { name: 'Negative Air Machines', qty: 2, cost: 200 },
      { name: 'Decontamination Unit', qty: 1, cost: 300 },
    ]),
    equipment_cost: 1000,
    materials_needed: JSON.stringify([
      { name: 'Poly Sheeting', qty: 20, unit: 'rolls', cost: 600 },
      { name: 'PPE Kits', qty: 15, cost: 450 },
      { name: 'Disposal Bags', qty: 50, cost: 150 },
    ]),
    materials_cost: 1200,
    disposal_method: 'Licensed asbestos disposal facility - Clean Harbors Denver',
    disposal_cost: 1350,
    total_direct_cost: 8800,
    markup_percentage: 20.88,
    total_price: 10636.07,
    is_active: true,
  }).select().single();
  if (estErr) { console.error('Estimate error:', estErr.message); return; }
  console.log('Estimate created:', est.id);

  // 7. Create estimates for other surveys
  const { data: est2, error: est2Err } = await supabase.from('estimates').insert({
    site_survey_id: survs[1].id,
    created_by: estAuth.user.id,
    estimated_duration_days: 3,
    estimated_labor_hours: 48,
    crew_type: 'Mold Remediation Crew',
    crew_size: 2,
    labor_rate_per_hour: 42,
    equipment_cost: 500,
    materials_cost: 600,
    disposal_cost: 400,
    total_direct_cost: 3516,
    markup_percentage: 19.45,
    total_price: 4200,
    is_active: true,
  }).select().single();
  if (est2Err) { console.error('Estimate 2 error:', est2Err.message); return; }

  const { data: est3, error: est3Err } = await supabase.from('estimates').insert({
    site_survey_id: survs[2].id,
    created_by: estAuth.user.id,
    estimated_duration_days: 10,
    estimated_labor_hours: 200,
    crew_type: 'Lead Abatement Crew',
    crew_size: 4,
    labor_rate_per_hour: 45,
    equipment_cost: 2000,
    materials_cost: 3500,
    disposal_cost: 2500,
    total_direct_cost: 17000,
    markup_percentage: 32.35,
    total_price: 22500,
    is_active: true,
  }).select().single();
  if (est3Err) { console.error('Estimate 3 error:', est3Err.message); return; }
  console.log('Additional estimates created');

  // 8. Create jobs (using actual DB schema: old jobs table)
  const { data: jobs, error: jobErr } = await supabase.from('jobs').insert([
    {
      organization_id: org.id, estimate_id: est.id, site_survey_id: survs[0].id,
      job_number: 'JOB-2026-001',
      status: 'completed',
      start_date: '2026-02-10', end_date: '2026-02-14',
      actual_start_date: '2026-02-10', actual_end_date: '2026-02-14',
      assigned_crew: JSON.stringify([
        { id: techAuth.user.id, name: 'Jake Miller', role: 'lead' },
      ]),
      project_manager_id: estAuth.user.id,
      actual_labor_hours: 118.5,
      actual_material_cost: 1180,
      actual_equipment_cost: 950,
      actual_disposal_cost: 1350,
    },
    {
      organization_id: org.id, estimate_id: est2.id, site_survey_id: survs[1].id,
      job_number: 'JOB-2026-002',
      status: 'scheduled',
      start_date: '2026-03-03', end_date: '2026-03-05',
      assigned_crew: JSON.stringify([]),
      project_manager_id: estAuth.user.id,
    },
    {
      organization_id: org.id, estimate_id: est3.id, site_survey_id: survs[2].id,
      job_number: 'JOB-2026-003',
      status: 'in_progress',
      start_date: '2026-02-24', end_date: '2026-03-07',
      actual_start_date: '2026-02-24',
      assigned_crew: JSON.stringify([
        { id: techAuth.user.id, name: 'Jake Miller', role: 'crew' },
      ]),
      project_manager_id: estAuth.user.id,
    },
  ]).select();
  if (jobErr) { console.error('Job error:', jobErr.message); return; }
  console.log('Jobs created:', jobs.length);

  // Summary
  console.log('\n=== SEED COMPLETE ===');
  console.log('Org:', org.name, '(' + org.id + ')');
  console.log('Team: Sarah Chen (estimator), Jake Miller (technician)');
  console.log('  Password for both: TestUser123!');
  console.log('Customers:', custs.length, '(3 active, 1 lead, 1 prospect)');
  console.log('Site surveys:', survs.length, '(completed, estimated, submitted, draft)');
  console.log('Estimates: 1');
  console.log('Jobs:', jobs.length, '(completed, scheduled, in_progress)');
  console.log('\nNote: invoices table does not exist yet in DB - migration needed');
}

seed().catch(e => console.error('Fatal:', e));
