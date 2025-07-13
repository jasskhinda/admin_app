import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Admin user creation script
async function createAdminUser() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    console.error('Please check your .env.local file');
    process.exit(1);
  }

  // Create admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const email = 'cctadmin@ccgrhc.com';
  const password = 'Openmyadmin5!';

  try {
    console.log('Creating admin user...');
    
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      filter: `email.eq.${email}`
    });
    
    if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
      console.log('User already exists. Updating password...');
      
      const userId = existingUsers.users[0].id;
      
      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true
      });
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        process.exit(1);
      }
      
      // Update profile to ensure admin role
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          role: 'admin',
          first_name: 'CCT',
          last_name: 'Admin',
          status: 'active'
        });
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
        process.exit(1);
      }
      
      console.log('✅ Password updated successfully for existing admin user');
      console.log('Email:', email);
      console.log('Password:', password);
      
    } else {
      console.log('Creating new admin user...');
      
      // Create new user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'admin'
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        process.exit(1);
      }

      const userId = userData.user.id;
      console.log('User created with ID:', userId);

      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          role: 'admin',
          first_name: 'CCT',
          last_name: 'Admin',
          status: 'active'
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        process.exit(1);
      }

      console.log('✅ Admin user created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role: admin');
    }
    
    console.log('\nYou can now login to the admin panel with these credentials.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});