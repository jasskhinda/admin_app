// Script to check and fix admin role for a user
// Usage: node check-admin-role.js <email>

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables!');
  console.error('Please ensure .env.local contains:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixAdminRole() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Please provide an email address');
    console.error('Usage: node check-admin-role.js <email>');
    process.exit(1);
  }

  try {
    console.log(`\nChecking user: ${email}\n`);

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (userError || !userData?.user) {
      console.error('User not found in auth.users:', userError?.message);
      process.exit(1);
    }

    const userId = userData.user.id;
    console.log(`Found user with ID: ${userId}`);

    // Check profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError.message);
      
      if (profileError.code === 'PGRST116') {
        console.log('\nNo profile found. Would you like to create an admin profile? (yes/no)');
        
        // Since we can't do interactive input in a simple script, we'll provide instructions
        console.log('\nTo create an admin profile, run:');
        console.log(`node create-admin-profile.js ${email}`);
      }
      return;
    }

    console.log('\nCurrent profile:');
    console.log(`- Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`- Role: ${profile.role}`);
    console.log(`- Email: ${profile.email || 'Not set in profile'}`);

    if (profile.role !== 'admin') {
      console.log('\n⚠️  User does not have admin role!');
      console.log('\nTo fix this, you can:');
      console.log('1. Run the following SQL in Supabase SQL Editor:');
      console.log(`   UPDATE profiles SET role = 'admin' WHERE id = '${userId}';`);
      console.log('\n2. Or use the update-role script:');
      console.log(`   node update-user-role.js ${email} admin`);
    } else {
      console.log('\n✅ User has admin role!');
      console.log('\nIf you\'re still having issues:');
      console.log('1. Clear browser cookies/cache');
      console.log('2. Try logging in again');
      console.log('3. Check browser console for errors');
    }

    // Check if email is set in profile
    if (!profile.email) {
      console.log('\n⚠️  Email not set in profile. Updating...');
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ email })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating email:', updateError.message);
      } else {
        console.log('✅ Email updated in profile');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAndFixAdminRole();