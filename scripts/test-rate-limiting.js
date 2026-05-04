#!/usr/bin/env node

/**
 * Test script for atomic rate limiting function
 * Run with: node scripts/test-rate-limiting.js
 * 
 * This script tests the race condition fix by making concurrent
 * requests and verifying only the expected number are allowed.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAtomicRateLimit() {
  console.log('🧪 Testing atomic rate limiting...\n');

  try {
    // Create test API key with low rate limit
    console.log('📝 Creating test API key...');
    
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Test Atomic Rate Limit Org' })
      .select('id')
      .single();
    
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        organization_id: org.id,
        full_name: 'Test User',
        role: 'admin'
      })
      .select('id')
      .single();

    const { data: apiKey } = await supabase
      .from('api_keys')
      .insert({
        organization_id: org.id,
        name: 'Test Atomic Key',
        key_prefix: 'test_prefix',
        key_hash: 'test_hash',
        scopes: ['customers:read'],
        rate_limit: 5,  // Low limit for testing
        created_by: profile.id,
        is_active: true
      })
      .select('id')
      .single();

    console.log(`✅ Created test API key: ${apiKey.id}\n`);

    // Test concurrent requests
    console.log('🚀 Making 20 concurrent requests (rate limit: 5)...');
    
    const requests = Array(20).fill(null).map((_, i) => 
      supabase.rpc('check_and_increment_rate_limit', {
        p_key_id: apiKey.id
      }).then(result => ({ index: i, ...result }))
    );

    const results = await Promise.all(requests);
    
    // Analyze results
    const successful = results.filter(r => r.data?.allowed === true);
    const failed = results.filter(r => r.data?.allowed === false);
    
    console.log(`✅ Allowed requests: ${successful.length}`);
    console.log(`❌ Denied requests: ${failed.length}`);
    console.log(`📊 Expected allowed: 5`);
    
    if (successful.length === 5) {
      console.log('\n🎉 SUCCESS: Atomic rate limiting working correctly!');
      console.log('   No race condition detected - exactly 5 requests allowed.');
    } else {
      console.log('\n⚠️  WARNING: Unexpected behavior detected!');
      console.log(`   Expected 5 allowed requests, got ${successful.length}`);
      
      if (successful.length > 5) {
        console.log('   This suggests a race condition may still exist.');
      }
    }

    // Show remaining counts
    console.log('\n📈 Request details:');
    successful.forEach((result, i) => {
      console.log(`  Request ${result.index}: allowed, remaining: ${result.data.remaining}`);
    });

    // Test reset function
    console.log('\n🔄 Testing rate limit reset...');
    const { data: resetResult } = await supabase.rpc('reset_rate_limit', {
      p_key_id: apiKey.id
    });
    
    if (resetResult === true) {
      console.log('✅ Rate limit reset successful');
      
      // Test one more request after reset
      const { data: afterReset } = await supabase.rpc('check_and_increment_rate_limit', {
        p_key_id: apiKey.id
      });
      
      if (afterReset?.allowed === true && afterReset?.remaining === 4) {
        console.log('✅ Post-reset request successful (remaining: 4)');
      } else {
        console.log('⚠️  Post-reset request unexpected result:', afterReset);
      }
    } else {
      console.log('❌ Rate limit reset failed');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('api_keys').delete().eq('id', apiKey.id);
    await supabase.from('profiles').delete().eq('id', profile.id);
    await supabase.from('organizations').delete().eq('id', org.id);
    
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAtomicRateLimit();