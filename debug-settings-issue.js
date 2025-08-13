require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Check environment variables
console.log('=== Environment Variables Check ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n❌ Missing Supabase environment variables!');
  console.log('This is why the settings page shows "Loading settings..." forever.');
  console.log('\nTo fix this:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Fill in your Supabase URL and anon key');
  console.log('3. Restart your development server');
  process.exit(1);
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('\n=== Testing Supabase Connection ===');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Supabase connection error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.log('❌ Supabase connection failed:', err.message);
    return false;
  }
}

// Test admin user
async function testAdminUser() {
  try {
    console.log('\n=== Testing Admin User ===');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Check if admin user exists
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'cctadmin@ccgrhc.com')
      .limit(1);

    if (error) {
      console.log('❌ Error checking admin user:', error.message);
      return false;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ Admin user cctadmin@ccgrhc.com not found in profiles table');
      console.log('You may need to create the admin user first');
      return false;
    }

    const profile = profiles[0];
    console.log('✅ Admin user found:');
    console.log('  - ID:', profile.id);
    console.log('  - Email:', profile.email);
    console.log('  - Role:', profile.role);
    console.log('  - Full Name:', profile.full_name);
    
    return true;
  } catch (err) {
    console.log('❌ Error testing admin user:', err.message);
    return false;
  }
}

async function main() {
  const connectionOk = await testSupabaseConnection();
  if (connectionOk) {
    await testAdminUser();
  }
  
  console.log('\n=== Summary ===');
  console.log('If you see errors above, fix them and the settings page should work.');
  console.log('If everything looks good, the issue might be in the browser console.');
}

main().catch(console.error);