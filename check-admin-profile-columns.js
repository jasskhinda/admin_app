// Script to check if admin profile columns exist
// Run this to verify the profiles table has all necessary columns for admin settings

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfileColumns() {
  try {
    console.log('🔍 Checking profiles table structure...\n');

    // Get table structure
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying profiles table:', error.message);
      return;
    }

    // Required columns for admin settings
    const requiredColumns = [
      'id',
      'full_name',
      'phone_number',
      'address',
      'role',
      'created_at',
      'updated_at'
    ];

    // Check if we have any data to inspect columns
    if (data && data.length > 0) {
      const availableColumns = Object.keys(data[0]);
      
      console.log('✅ Available columns in profiles table:');
      availableColumns.forEach(col => {
        const isRequired = requiredColumns.includes(col);
        console.log(`   ${isRequired ? '✓' : '•'} ${col}${isRequired ? ' (required)' : ''}`);
      });

      console.log('\n📋 Column status:');
      requiredColumns.forEach(col => {
        const exists = availableColumns.includes(col);
        console.log(`   ${exists ? '✅' : '❌'} ${col} - ${exists ? 'EXISTS' : 'MISSING'}`);
      });

      const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('\n🎉 All required columns exist! Admin settings should work properly.');
      } else {
        console.log('\n⚠️  Missing columns detected:');
        missingColumns.forEach(col => {
          console.log(`   - ${col}`);
        });
        
        console.log('\n📝 SQL to add missing columns:');
        if (missingColumns.includes('phone_number')) {
          console.log('ALTER TABLE profiles ADD COLUMN phone_number TEXT;');
        }
        if (missingColumns.includes('address')) {
          console.log('ALTER TABLE profiles ADD COLUMN address TEXT;');
        }
      }
    } else {
      console.log('⚠️  No data in profiles table to check column structure');
      console.log('   This might be normal if no users exist yet');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

// Run the check
checkProfileColumns();