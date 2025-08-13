// Script to safely delete user j.khinda@ccgrhc.com
// This will delete from both auth.users and profiles tables

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const EMAIL_TO_DELETE = 'j.khinda@ccgrhc.com';

async function deleteUser() {
  try {
    console.log(`🔍 Looking for user with email: ${EMAIL_TO_DELETE}\n`);

    // First, find the user in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    const userToDelete = authUsers.users.find(user => user.email === EMAIL_TO_DELETE);
    
    if (!userToDelete) {
      console.log('ℹ️  User not found in auth.users table');
      console.log('   This might mean the user was already deleted or never existed');
      
      // Check if there's a profile without auth user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', EMAIL_TO_DELETE)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Error checking profiles:', profileError.message);
        return;
      }
      
      if (profileData) {
        console.log('⚠️  Found orphaned profile, deleting...');
        const { error: deleteProfileError } = await supabase
          .from('profiles')
          .delete()
          .eq('email', EMAIL_TO_DELETE);
        
        if (deleteProfileError) {
          console.error('❌ Error deleting orphaned profile:', deleteProfileError.message);
        } else {
          console.log('✅ Orphaned profile deleted successfully');
        }
      }
      
      return;
    }

    console.log('✅ Found user in auth.users:');
    console.log(`   ID: ${userToDelete.id}`);
    console.log(`   Email: ${userToDelete.email}`);
    console.log(`   Created: ${userToDelete.created_at}`);
    console.log(`   Last Sign In: ${userToDelete.last_sign_in_at || 'Never'}\n`);

    // Check if user has a profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userToDelete.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError.message);
      return;
    }

    if (profileData) {
      console.log('✅ Found associated profile:');
      console.log(`   Name: ${profileData.full_name || 'Not set'}`);
      console.log(`   Role: ${profileData.role || 'Not set'}`);
      console.log(`   Created: ${profileData.created_at}\n`);
    } else {
      console.log('ℹ️  No associated profile found\n');
    }

    // Delete the user (this will cascade to profiles if foreign key is set up correctly)
    console.log('🗑️  Deleting user from auth.users...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError.message);
      
      // If auth deletion failed, try to delete profile manually
      if (profileData) {
        console.log('🔄 Attempting to delete profile manually...');
        const { error: manualProfileDeleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userToDelete.id);
        
        if (manualProfileDeleteError) {
          console.error('❌ Error deleting profile manually:', manualProfileDeleteError.message);
        } else {
          console.log('✅ Profile deleted manually');
        }
      }
      return;
    }

    console.log('✅ User deleted successfully from auth.users');

    // Verify profile was also deleted
    const { data: remainingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userToDelete.id)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ Associated profile was also deleted (cascade worked)');
    } else if (remainingProfile) {
      console.log('⚠️  Profile still exists, deleting manually...');
      const { error: manualDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);
      
      if (manualDeleteError) {
        console.error('❌ Error deleting remaining profile:', manualDeleteError.message);
      } else {
        console.log('✅ Remaining profile deleted manually');
      }
    }

    console.log('\n🎉 User deletion completed successfully!');
    console.log(`   ${EMAIL_TO_DELETE} has been removed from the system`);
    console.log('   You can now register this email address again');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

// Confirmation prompt
console.log('⚠️  USER DELETION SCRIPT');
console.log('='.repeat(50));
console.log(`This will permanently delete: ${EMAIL_TO_DELETE}`);
console.log('This action cannot be undone!');
console.log('='.repeat(50));

// Run the deletion
deleteUser();