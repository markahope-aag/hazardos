#!/usr/bin/env node

/**
 * Test Authenticated Profile Fetch
 * 
 * This script tests profile fetching with proper authentication
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

async function testAuthenticatedProfileFetch() {
  console.log('🔍 Testing Authenticated Profile Fetch\n');
  
  try {
    // Try to sign in with the user's credentials
    console.log('1. Attempting to sign in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'mark.hope@asymmetric.pro',
      password: 'your-password-here' // You'll need to provide the actual password
    });
    
    if (authError) {
      console.log('❌ Sign in failed:', authError.message);
      console.log('\n⚠️  Cannot test with authentication. Testing RLS policies directly...\n');
      
      // Test if RLS policies are working by checking what happens with auth.uid()
      console.log('2. Testing RLS policy behavior...');
      
      // This should fail because there's no authenticated user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', 'd48c0865-f30d-4bf9-b7af-e52d5019b7b0')
        .single();
      
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('✅ RLS is working - no rows returned for unauthenticated user');
        } else {
          console.log('❌ Unexpected error:', profileError);
        }
      } else {
        console.log('⚠️  RLS might not be working - data returned without auth:', profileData);
      }
      
      return;
    }
    
    console.log('✅ Signed in successfully:', authData.user.email);
    
    // Now test profile fetch with authentication
    console.log('\n2. Testing profile fetch with authentication...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, organization_id')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError);
    } else {
      console.log('✅ Profile fetch succeeded:', profileData);
    }
    
    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAuthenticatedProfileFetch();