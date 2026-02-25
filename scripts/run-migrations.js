/**
 * Migration runner for hosted Supabase
 * Executes SQL migrations via the Supabase Management API
 *
 * Run: node scripts/run-migrations.js
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL (e.g., https://abcdef.supabase.co -> abcdef)
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];

async function runSQL(sql, label) {
  // Use the Supabase SQL endpoint (postgrest rpc or pg_net)
  // Since we have service_role, we can use the SQL API
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Try the pg_query approach via a temp function
    return null;
  }
  return await res.json();
}

async function execSQL(sql) {
  // Use supabase-js to execute raw SQL via rpc
  // We need to create a helper function first, or use the SQL editor API

  // The Supabase hosted platform exposes a SQL execution endpoint
  // at /pg/query for service role keys
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL execution failed (${res.status}): ${text}`);
  }
  return await res.json();
}

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  // First, test if we can execute SQL
  try {
    const test = await execSQL('SELECT 1 as test');
    console.log('SQL execution test: OK\n');
  } catch (err) {
    console.error('Cannot execute SQL directly:', err.message);
    console.log('\nThe hosted Supabase SQL API may not be available via REST.');
    console.log('Alternative: Use the Supabase Dashboard SQL Editor to run migrations.');
    console.log('\nGenerating a combined migration file instead...\n');

    // Generate a combined SQL file
    await generateCombinedMigration(migrationsDir, files);
    return;
  }

  // Run each migration
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Running: ${file}...`);
    try {
      await execSQL(sql);
      console.log(`  ✓ Success`);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message.substring(0, 200)}`);
    }
  }
}

async function generateCombinedMigration(migrationsDir, files) {
  // Skip migrations that created the initial tables we already have
  // The initial schema (20260131170746) already ran partially
  const skipFiles = new Set([
    '20260131135419_create_customers_table.sql',      // customers exists
    '20260131170746_initial_schema.sql',               // ran (created old estimates/jobs)
    '20260131170912_rls_policies.sql',                 // ran
    '20260131180000_rename_assessments_to_site_surveys.sql', // ran
    '20260131195342_create_customers_table.sql',       // duplicate
    '20260131200000_add_mobile_survey_fields.sql',     // ran
    '20260131210000_fix_rls_infinite_recursion.sql',   // ran
    '20260131135551_add_customer_linkage_to_site_surveys.sql', // ran
    '20260131135626_add_scheduling_fields_to_site_surveys.sql', // ran
    '20260131135724_create_pricing_settings_tables.sql', // ran
    '20260303000001_security_rls_fixes.sql',           // ran
    '20260303000002_ai_consent_and_pii_protection.sql', // ran (ai_usage_log exists)
    '20260303000003_add_full_name_to_profiles.sql',    // ran
    '20260303000004_fix_handle_new_user_trigger.sql',  // ran
    '20260303000005_debug_auth_triggers.sql',          // ran
    '20260303000006_recreate_handle_new_user.sql',     // ran
    '20260303000007_fix_profiles_rls_hang.sql',        // ran
    '20260303000008_fix_profiles_rls_simple.sql',      // ran
    '20260401000001_fix_rls_security_gaps.sql',        // ran
    '20260401000002_fix_function_search_paths.sql',    // ran
  ]);

  let combined = `-- Combined migration for HazardOS
-- Generated: ${new Date().toISOString()}
-- This runs all pending migrations that haven't been applied to the hosted DB
--
-- IMPORTANT: The old estimates and jobs tables need to be dropped first
-- since newer migrations recreate them with a better schema.

-- ============================================================
-- STEP 0: Drop old tables that will be recreated
-- ============================================================

-- Back up seed data references before dropping
-- (The seed script can be re-run after migrations)

DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;

-- Drop old enums that may conflict
DROP TYPE IF EXISTS estimate_status CASCADE;
DROP TYPE IF EXISTS line_item_type CASCADE;
DROP TYPE IF EXISTS proposal_status CASCADE;
DROP TYPE IF EXISTS sms_status CASCADE;
DROP TYPE IF EXISTS sms_message_type CASCADE;

`;

  for (const file of files) {
    if (skipFiles.has(file)) {
      combined += `-- SKIPPED (already applied): ${file}\n\n`;
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    combined += `-- ============================================================\n`;
    combined += `-- Migration: ${file}\n`;
    combined += `-- ============================================================\n\n`;
    combined += sql + '\n\n';
  }

  const outPath = path.join(__dirname, 'combined-migration.sql');
  fs.writeFileSync(outPath, combined, 'utf8');
  console.log(`Combined migration written to: scripts/combined-migration.sql`);
  console.log(`Size: ${(combined.length / 1024).toFixed(1)} KB`);
  console.log(`\nTo apply, copy this file's contents into the Supabase Dashboard SQL Editor and run it.`);
  console.log(`Or use: npx supabase db execute < scripts/combined-migration.sql (requires Docker)`);
}

main().catch(console.error);
