const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runSQLScript() {
  try {
    // Read the SQL script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-rejected-trips-complete.sql'), 'utf8');
    
    console.log('Executing SQL script to fix rejected trips...');
    console.log('Script content:');
    console.log('-'.repeat(50));
    console.log(sqlScript);
    console.log('-'.repeat(50));
    
    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { sql_text: sqlScript });
    
    if (error) {
      console.error('Error executing SQL script:', error);
      return;
    }
    
    console.log('Success! SQL script executed successfully.');
    console.log('Result:', data);
    
  } catch (err) {
    console.error('Failed to run SQL script:', err.message);
  }
}

// Run the script
runSQLScript();