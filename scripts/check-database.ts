import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('=== Database Health Check ===\n')

  // Check core tables exist and have data
  const tables = [
    'organizations',
    'profiles',
    'customers',
    'jobs',
    'estimates',
    'invoices',
    'proposals',
    'site_surveys',
    'notifications',
    'api_keys',
    'labor_rates',
    'equipment_rates',
    'material_costs',
    'sms_messages',
    'billing_invoices',
    'subscription_plans'
  ]

  console.log('Table Status:')
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`)
      } else {
        console.log(`  ✓ ${table}: ${count ?? 0} rows`)
      }
    } catch (e) {
      console.log(`  ❌ ${table}: ${e}`)
    }
  }

  // Test query performance on key tables
  console.log('\nQuery Performance:')

  const perfTests = [
    { name: 'customers (search pattern)', query: () => supabase.from('customers').select('id, name').limit(10) },
    { name: 'jobs (status filter)', query: () => supabase.from('jobs').select('id, status').limit(10) },
    { name: 'notifications (user lookup)', query: () => supabase.from('notifications').select('id').limit(10) },
    { name: 'site_surveys', query: () => supabase.from('site_surveys').select('id').limit(10) },
  ]

  for (const test of perfTests) {
    const start = Date.now()
    const { error } = await test.query()
    const duration = Date.now() - start
    if (error) {
      console.log(`  ❌ ${test.name}: ERROR - ${error.message}`)
    } else {
      const status = duration < 100 ? '✓' : duration < 500 ? '⚠' : '❌'
      console.log(`  ${status} ${test.name}: ${duration}ms`)
    }
  }

  // Check for recent migrations by looking at schema
  console.log('\nSchema Features Check:')

  const schemaChecks = [
    { name: 'SMS tables', table: 'sms_messages' },
    { name: 'Notification preferences', table: 'notification_preferences' },
    { name: 'API keys', table: 'api_keys' },
    { name: 'Billing invoices', table: 'billing_invoices' },
    { name: 'Job completion photos', table: 'job_completion_photos' },
    { name: 'Job time entries', table: 'job_time_entries' },
    { name: 'Audit log', table: 'audit_log' },
  ]

  for (const check of schemaChecks) {
    const { error } = await supabase.from(check.table).select('id').limit(1)
    if (error && error.code === '42P01') {
      console.log(`  ❌ ${check.name}: Table missing`)
    } else if (error) {
      console.log(`  ⚠ ${check.name}: ${error.message}`)
    } else {
      console.log(`  ✓ ${check.name}: OK`)
    }
  }

  console.log('\n=== Check Complete ===')
}

checkDatabase().catch(console.error)
