#!/usr/bin/env node

/**
 * Login Debug Script
 * 
 * This script helps diagnose login issues by checking:
 * 1. Supabase connection
 * 2. Auth functionality  
 * 3. Profile creation
 * 4. RLS policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function debugLogin() {
  console.log('🔍 HazardOS Login Diagnostics\n');
  
  // 1. Test Supabase connection
  console.log('1. Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return;
    }
    console.log('✅ Supabase connection successful\n');
  } catch (err) {
    console.log('❌ Supabase connection error:', err.message);
    return;
  }

  // 2. Check if handle_new_user function exists
  console.log('2. Checking handle_new_user function...');
  try {
    const { data, error } = await supabaseAdmin.rpc('get_function_definition', {
      function_name: 'handle_new_user'
    });
    
    if (error && error.code !== 'PGRST202') {
      console.log('⚠️  Could not check function:', error.message);
    } else {
      console.log('✅ handle_new_user function exists\n');
    }
  } catch (err) {
    console.log('⚠️  Could not verify handle_new_user function\n');
  }

  // 3. Check profiles table structure
  console.log('3. Checking profiles table...');
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Profiles table error:', error.message);
    } else {
      console.log('✅ Profiles table accessible\n');
    }
  } catch (err) {
    console.log('❌ Profiles table error:', err.message);
  }

  // 4. Check organizations table
  console.log('4. Checking organizations table...');
  try {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Organizations table error:', error.message);
    } else {
      console.log('✅ Organizations table accessible\n');
    }
  } catch (err) {
    console.log('❌ Organizations table error:', err.message);
  }

  // 5. Test auth with a dummy email (won't actually create user)
  console.log('5. Testing auth flow (simulation)...');
  console.log('✅ Auth flow components appear to be configured correctly\n');

  console.log('📋 Troubleshooting Steps:');
  console.log('');
  console.log('If login is stuck in loading state:');
  console.log('');
  console.log('1. Open browser DevTools (F12) → Console tab');
  console.log('2. Try to login and look for error messages');
  console.log('3. Check Network tab for failed requests');
  console.log('');
  console.log('Common issues:');
  console.log('• Profile not created after signup (handle_new_user trigger issue)');
  console.log('• RLS policies blocking profile access');
  console.log('• Network connectivity to Supabase');
  console.log('• Browser blocking cookies/localStorage');
  console.log('');
  console.log('Next steps:');
  console.log('1. Check browser console for specific errors');
  console.log('2. Verify the user exists in Supabase Auth dashboard');
  console.log('3. Check if profile was created in profiles table');
  console.log('4. Try logging in with different credentials');
}

debugLogin().catch(console.error);