/**
 * Seed 4 future jobs for Acme Remediation
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORG_ID = '8cfe1783-a3f1-444f-b4d7-6f5d6dee0f8f';
const SARAH_ID = '779b9c19-ab7c-4591-9dd8-b35b99a57e7b';
const JAKE_ID = '6c7f1cb9-11a2-492d-ab57-5a6bb1d0f7e4';

const CUSTOMERS = {
  garcia: 'ca053cb7-9ed9-4856-891c-9e199f5589f6',
  richardson: '7d1b5865-e297-42cc-9d4d-1e28abc40588',
  denver_school: 'f7abd82e-30de-4fee-a42f-8f345c8d7c12',
  wong: '42e29a9a-5264-4aba-ab33-891204565f01',
  mvhoa: '7adfd1fd-6341-4d7a-ba34-80b4cd1f6c56',
};

async function main() {
  console.log('Seeding 4 future jobs for Acme Remediation...\n');

  const { data: jobs, error } = await supabase
    .from('jobs')
    .insert([
      {
        organization_id: ORG_ID,
        customer_id: CUSTOMERS.wong,
        job_number: 'JOB-2026-0004',
        name: 'Wong Residence - Bathroom Mold Remediation',
        status: 'scheduled',
        hazard_types: ['mold'],
        scheduled_start_date: '2026-04-14',
        scheduled_start_time: '08:00',
        scheduled_end_date: '2026-04-15',
        scheduled_end_time: '17:00',
        estimated_duration_hours: 16,
        job_address: '1200 Pearl St',
        job_city: 'Boulder',
        job_state: 'CO',
        job_zip: '80302',
        access_notes: 'Ring doorbell. Homeowner will be present.',
        contact_onsite_name: 'Lisa Wong',
        contact_onsite_phone: '(303) 555-0404',
        contract_amount: 5200.00,
        special_instructions: 'Mold concentrated behind master bath shower wall. Containment required. HEPA air scrubbers on-site.',
        inspection_required: true,
        created_by: SARAH_ID,
      },
      {
        organization_id: ORG_ID,
        customer_id: CUSTOMERS.mvhoa,
        job_number: 'JOB-2026-0005',
        name: 'Mountain View HOA - Lead Paint Abatement Units 4-8',
        status: 'scheduled',
        hazard_types: ['lead'],
        scheduled_start_date: '2026-04-21',
        scheduled_start_time: '07:00',
        scheduled_end_date: '2026-04-25',
        scheduled_end_time: '16:00',
        estimated_duration_hours: 40,
        job_address: '800 Mountain View Dr',
        job_city: 'Lakewood',
        job_state: 'CO',
        job_zip: '80228',
        access_notes: 'Property manager on-site Mon-Fri. Unit keys at front office.',
        contact_onsite_name: 'Dave Kowalski (Property Mgr)',
        contact_onsite_phone: '(303) 555-0505',
        contract_amount: 18750.00,
        internal_notes: 'Phase 2 of 3. Units 1-3 completed in January. Units 9-12 scheduled for June.',
        special_instructions: 'EPA RRP Rule applies. All workers must have RRP certification. Residents relocated during work.',
        inspection_required: true,
        created_by: SARAH_ID,
      },
      {
        organization_id: ORG_ID,
        customer_id: CUSTOMERS.garcia,
        job_number: 'JOB-2026-0006',
        name: 'Garcia Property - Attic Vermiculite Insulation Removal',
        status: 'scheduled',
        hazard_types: ['asbestos_friable'],
        scheduled_start_date: '2026-05-05',
        scheduled_start_time: '06:30',
        scheduled_end_date: '2026-05-09',
        scheduled_end_time: '15:00',
        estimated_duration_hours: 36,
        job_address: '456 Elm St',
        job_city: 'Denver',
        job_state: 'CO',
        job_zip: '80220',
        access_notes: 'Same property as JOB-2026-0001. Attic access through hallway ceiling hatch.',
        contact_onsite_name: 'Maria Garcia',
        contact_onsite_phone: '(303) 555-0201',
        contract_amount: 14800.00,
        internal_notes: 'Follow-up from initial pipe insulation job. Maria requested quote after we flagged the vermiculite during first survey.',
        special_instructions: 'CDPHE 10-day notification required. Full negative pressure containment. Wet removal method.',
        inspection_required: true,
        created_by: SARAH_ID,
      },
      {
        organization_id: ORG_ID,
        customer_id: CUSTOMERS.richardson,
        job_number: 'JOB-2026-0007',
        name: 'Richardson Construction - Pre-Demo Hazmat Survey & Abatement',
        status: 'scheduled',
        hazard_types: ['asbestos_non_friable', 'lead', 'mold'],
        scheduled_start_date: '2026-05-18',
        scheduled_start_time: '07:00',
        scheduled_end_date: '2026-05-30',
        scheduled_end_time: '16:00',
        estimated_duration_hours: 80,
        job_address: '1550 Wazee St',
        job_city: 'Denver',
        job_state: 'CO',
        job_zip: '80202',
        access_notes: 'Active construction site. Hard hat and steel toe required. Sign in at job trailer.',
        contact_onsite_name: 'Tom Richardson',
        contact_onsite_phone: '(303) 555-0202',
        contract_amount: 42500.00,
        internal_notes: 'Largest job to date. Full pre-demolition abatement for commercial building. Richardson wants us as exclusive hazmat sub.',
        special_instructions: 'Multi-hazard abatement: ACM floor tile, pipe wrap, transite siding; lead paint on structural steel; mold in basement. Coordinate with demo contractor for phased access.',
        inspection_required: true,
        created_by: SARAH_ID,
      },
    ])
    .select('id, job_number, name, status, scheduled_start_date');

  if (error) {
    console.error('Error inserting jobs:', error.message);
    return;
  }

  console.log('Created jobs:');
  jobs.forEach(j => console.log(`  ${j.job_number}: ${j.name} (${j.scheduled_start_date})`));

  // Assign crew to future jobs
  console.log('\nAssigning crew...');
  const crewAssignments = [
    { job_id: jobs[0].id, profile_id: JAKE_ID, role: 'lead', is_lead: true },
    { job_id: jobs[1].id, profile_id: JAKE_ID, role: 'lead', is_lead: true },
    { job_id: jobs[1].id, profile_id: SARAH_ID, role: 'supervisor', is_lead: false },
    { job_id: jobs[2].id, profile_id: JAKE_ID, role: 'lead', is_lead: true },
    { job_id: jobs[3].id, profile_id: JAKE_ID, role: 'lead', is_lead: true },
    { job_id: jobs[3].id, profile_id: SARAH_ID, role: 'supervisor', is_lead: false },
  ];

  const { error: crewError } = await supabase.from('job_crew').insert(crewAssignments);
  if (crewError) {
    console.error('Error assigning crew:', crewError.message);
  } else {
    console.log('  Crew assigned to all 4 jobs');
  }

  console.log('\nDone!');
}

main();
