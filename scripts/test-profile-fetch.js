#!/usr/bin/env node

/**
 * Test Profile Fetch
 * 
 * This script tests the exact profile query that's hanging in the auth hook
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProfileFetch() {
  console.log('🔍 Testing Profile Fetch for User: d48c0865-f30d-4bf9-b7af-e52d5019b7b0\n');
  
  const userId = 'd48c0865-f30d-4bf9-b7af-e52d5019b7b0';
  
  try {
    // First, let's try to authenticate as this user to get proper context
    console.log('1. Testing without authentication context...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, role, organization_id, is_active, is_platform_user, last_login_at, login_count, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError);
      
      // Let's try a simpler query
      console.log('\n2. Testing simpler query...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .single();
        
      if (simpleError) {
        console.log('❌ Simple query also failed:', simpleError);
      } else {
        console.log('✅ Simple query succeeded:', simpleData);
      }
      
      // Let's try without the single() constraint
      console.log('\n3. Testing without single() constraint...');
      const { data: arrayData, error: arrayError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', userId);
        
      if (arrayError) {
        console.log('❌ Array query failed:', arrayError);
      } else {
        console.log('✅ Array query succeeded:', arrayData);
      }
      
    } else {
      console.log('✅ Profile fetch succeeded:', profileData);
    }
    
    // Let's also check if the user exists at all
    console.log('\n4. Testing if any profile exists for this user...');
    const { data: existsData, error: existsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId);
      
    if (existsError) {
      console.log('❌ Exists check failed:', existsError);
    } else {
      console.log('✅ Exists check result:', existsData);
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }
}

// Add timeout to prevent hanging
const timeout = setTimeout(() => {
  console.log('❌ Query timed out after 10 seconds - this confirms the hanging issue');
  process.exit(1);
}, 10000);

testProfileFetch().then(() => {
  clearTimeout(timeout);
  console.log('\n✅ Test completed');
}).catch((error) => {
  clearTimeout(timeout);
  console.error('❌ Test failed:', error);
});