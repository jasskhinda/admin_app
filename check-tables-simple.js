const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Check what tables exist using a simpler approach
async function checkTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('📊 Checking likely client-related tables...');
    
    // Try each table that might exist
    const possibleTables = [
      'profiles',
      'facilities', 
      'managed_clients',
      'facility_managed_clients',
      'facility_clients',
      'clients',
      'trips'
    ];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: exists (${data.length} rows in sample)`);
          if (data.length > 0) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
    // Now let's specifically check for facility clients
    console.log('\n🔍 Checking for facility clients...');
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Try facility_managed_clients first
    try {
      const { data: facilityClients, error } = await supabase
        .from('facility_managed_clients')
        .select('*')
        .eq('facility_id', facilityId);
      
      if (!error) {
        console.log(`Found ${facilityClients.length} facility managed clients`);
        if (facilityClients.length > 0) {
          console.log('Sample:', JSON.stringify(facilityClients[0], null, 2));
        }
      }
    } catch (err) {
      console.log('No facility_managed_clients table');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();