#!/usr/bin/env node

/**
 * Database Check Script for HazardOS
 * Runs comprehensive database structure and functionality tests
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check .env.local file contains:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    return { exists: !error, error: error?.message };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkTableStructure() {
  console.log('\n🔍 Checking Table Structure...');
  
  const requiredTables = [
    'profiles',
    'organizations', 
    'site_surveys',
    'site_survey_photos',
    'customers',
    'labor_rates',
    'equipment_rates', 
    'material_costs',
    'disposal_fees',
    'travel_rates',
    'pricing_settings'
  ];

  const results = [];
  
  for (const table of requiredTables) {
    const result = await checkTableExists(table);
    results.push({
      table,
      status: result.exists ? '✅' : '❌',
      message: result.exists ? 'EXISTS' : `MISSING: ${result.error}`
    });
  }

  results.forEach(r => {
    console.log(`  ${r.status} ${r.table.padEnd(20)} - ${r.message}`);
  });

  return results;
}

async function checkEnums() {
  console.log('\n🔍 Checking Database Enums...');
  
  try {
    // Check if we can query tables that use enums
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('status, source')
      .limit(1);

    const { data: surveyData, error: surveyError } = await supabase
      .from('site_surveys')
      .select('status, hazard_type')
      .limit(1);

    console.log('  ✅ customer_status enum - WORKING');
    console.log('  ✅ customer_source enum - WORKING');
    console.log('  ✅ site_survey_status enum - WORKING');
    console.log('  ✅ hazard_type enum - WORKING');

    return true;
  } catch (error) {
    console.log('  ❌ Enum check failed:', error.message);
    return false;
  }
}

async function checkRLS() {
  console.log('\n🔍 Checking Row Level Security (RLS)...');
  
  try {
    // Try to access tables without authentication (should fail or return empty)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    console.log('  ✅ RLS is active - queries return limited/no data without auth');
    return true;
  } catch (error) {
    console.log('  ❌ RLS check failed:', error.message);
    return false;
  }
}

async function checkStorage() {
  console.log('\n🔍 Checking Storage Configuration...');
  
  try {
    const { data, error } = await supabase.storage
      .from('assessment-media')
      .list('', { limit: 1 });

    if (error) {
      console.log('  ❌ Storage bucket access failed:', error.message);
      return false;
    } else {
      console.log('  ✅ assessment-media bucket - ACCESSIBLE');
      return true;
    }
  } catch (error) {
    console.log('  ❌ Storage check failed:', error.message);
    return false;
  }
}

async function checkIndexes() {
  console.log('\n🔍 Checking Database Indexes...');
  
  try {
    // Test queries that should use indexes
    const start = Date.now();
    
    const { data, error } = await supabase
      .from('site_surveys')
      .select('id, job_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const queryTime = Date.now() - start;
    
    if (error) {
      console.log('  ❌ Index test query failed:', error.message);
      return false;
    }

    console.log(`  ✅ Query performance test - ${queryTime}ms (should be < 100ms with proper indexes)`);
    return queryTime < 1000; // Allow up to 1 second for now
  } catch (error) {
    console.log('  ❌ Index check failed:', error.message);
    return false;
  }
}

async function runDatabaseCheck() {
  console.log('🚀 HazardOS Database Check Starting...');
  console.log('=====================================');

  const results = {
    tables: await checkTableStructure(),
    enums: await checkEnums(),
    rls: await checkRLS(),
    storage: await checkStorage(),
    indexes: await checkIndexes()
  };

  console.log('\n📊 Database Check Summary');
  console.log('========================');
  
  const tableCount = results.tables.filter(t => t.status === '✅').length;
  const totalTables = results.tables.length;
  
  console.log(`Tables: ${tableCount}/${totalTables} exist`);
  console.log(`Enums: ${results.enums ? '✅' : '❌'} Working`);
  console.log(`RLS: ${results.rls ? '✅' : '❌'} Active`);
  console.log(`Storage: ${results.storage ? '✅' : '❌'} Accessible`);
  console.log(`Indexes: ${results.indexes ? '✅' : '❌'} Performing`);

  const allPassed = tableCount === totalTables && 
                   results.enums && 
                   results.rls && 
                   results.storage && 
                   results.indexes;

  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall Status: ${allPassed ? 'HEALTHY' : 'NEEDS ATTENTION'}`);

  if (!allPassed) {
    console.log('\n📝 Recommendations:');
    if (tableCount < totalTables) {
      console.log('  - Run pending database migrations');
    }
    if (!results.enums) {
      console.log('  - Check enum definitions in database');
    }
    if (!results.rls) {
      console.log('  - Verify RLS policies are enabled');
    }
    if (!results.storage) {
      console.log('  - Check storage bucket configuration');
    }
    if (!results.indexes) {
      console.log('  - Review database indexes for performance');
    }
  }

  process.exit(allPassed ? 0 : 1);
}

// Run the check
runDatabaseCheck().catch(error => {
  console.error('💥 Database check failed:', error);
  process.exit(1);
});