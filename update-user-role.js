// Script to update a user's role
// Usage: node update-user-role.js <email> <role>

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

const validRoles = ['client', 'dispatcher', 'driver', 'facility', 'admin'];

async function updateUserRole() {
  const email = process.argv[2];
  const newRole = process.argv[3];
  
  if (!email || !newRole) {
    console.error('Please provide email and role');
    console.error('Usage: node update-user-role.js <email> <role>');
    console.error(`Valid roles: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  if (!validRoles.includes(newRole)) {
    console.error(`Invalid role: ${newRole}`);
    console.error(`Valid roles: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  try {
    console.log(`\nUpdating user ${email} to role: ${newRole}\n`);

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (userError || !userData?.user) {
      console.error('User not found:', userError?.message);
      process.exit(1);
    }

    const userId = userData.user.id;
    console.log(`Found user with ID: ${userId}`);

    // Update profile role
    const { data, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: newRole,
        email: email // Ensure email is also set
      })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('Error updating role:', updateError.message);
      
      if (updateError.code === 'PGRST116') {
        console.log('\nProfile not found. Creating new profile...');
        
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            role: newRole,
            email: email,
            first_name: 'Admin',
            last_name: 'User'
          });
        
        if (insertError) {
          console.error('Error creating profile:', insertError.message);
          process.exit(1);
        }
        
        console.log(`✅ Created new ${newRole} profile for ${email}`);
      } else {
        process.exit(1);
      }
    } else {
      console.log(`✅ Successfully updated ${email} to role: ${newRole}`);
    }

    // Verify the update
    const { data: verifyProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', userId)
      .single();

    if (verifyProfile) {
      console.log('\nVerification:');
      console.log(`- Name: ${verifyProfile.first_name} ${verifyProfile.last_name}`);
      console.log(`- Role: ${verifyProfile.role}`);
    }

    console.log('\n🎉 Done! The user can now log in with the new role.');
    if (newRole === 'admin') {
      console.log('💡 They should now be able to access the admin app.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

updateUserRole();