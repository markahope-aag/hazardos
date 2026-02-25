#!/usr/bin/env node

/**
 * Create Missing Profile
 * 
 * This script creates a profile for the user who doesn't have one
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function createMissingProfile() {
  const userId = 'd48c0865-f30d-4bf9-b7af-e52d5019b7b0';
  const userEmail = 'mark.hope@asymmetric.pro';
  
  console.log('🔍 Creating missing profile for user:', userId);
  
  try {
    // First check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      return;
    }
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing profile:', checkError);
      return;
    }
    
    // Create the profile
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: userEmail,
        first_name: 'Mark',
        last_name: 'Hope',
        role: 'estimator',
        is_platform_user: false,
        is_active: true
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating profile:', createError);
    } else {
      console.log('✅ Profile created successfully:', newProfile);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createMissingProfile();