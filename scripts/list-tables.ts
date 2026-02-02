import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function listTables() {
  // Try to query each expected table
  const expectedTables = [
    'organizations', 'profiles', 'customers', 'jobs', 'estimates',
    'invoices', 'proposals', 'site_surveys', 'notifications',
    'notification_preferences', 'api_keys', 'billing_invoices',
    'subscription_plans', 'job_time_entries', 'job_completion_photos',
    'sms_messages', 'organization_sms_settings', 'audit_log',
    'labor_rates', 'equipment_rates', 'material_costs', 'travel_rates',
    'disposal_fees', 'pricing_settings', 'webhooks', 'webhook_deliveries'
  ]

  console.log('Checking tables...\n')

  const exists: string[] = []
  const missing: string[] = []
  const errors: string[] = []

  for (const table of expectedTables) {
    const { error } = await supabase.from(table).select('id').limit(1)

    if (!error) {
      exists.push(table)
    } else if (error.message.includes('does not exist') || error.code === '42P01') {
      missing.push(table)
    } else if (error.message.includes('schema cache')) {
      missing.push(table)
    } else {
      errors.push(`${table}: ${error.message}`)
    }
  }

  console.log('✅ EXISTING TABLES:', exists.length)
  exists.forEach(t => console.log(`   - ${t}`))

  console.log('\n❌ MISSING TABLES:', missing.length)
  missing.forEach(t => console.log(`   - ${t}`))

  if (errors.length > 0) {
    console.log('\n⚠️ ERRORS:')
    errors.forEach(e => console.log(`   - ${e}`))
  }
}

listTables()
