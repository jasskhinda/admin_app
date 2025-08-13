const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });the 

// Check what tables exist
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
    console.log('📊 Checking all tables in the database...');
    
    // Get all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.error('Error fetching tables:', error);
      return;
    }
    
    console.log('All tables:', tables.map(t => t.table_name));
    
    // Focus on client-related tables
    const clientTables = tables.filter(t => 
      t.table_name.includes('client') || 
      t.table_name.includes('facility') ||
      t.table_name.includes('profile')
    );
    
    console.log('\nClient/facility related tables:', clientTables.map(t => t.table_name));
    
    // Check facility_managed_clients if it exists
    const facilityManagedClientsExists = tables.some(t => t.table_name === 'facility_managed_clients');
    
    if (facilityManagedClientsExists) {
      console.log('\n🔍 Checking facility_managed_clients table...');
      
      const { data: facilityClients, error: facilityClientsError } = await supabase
        .from('facility_managed_clients')
        .select('*')
        .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3');
      
      if (facilityClientsError) {
        console.log('Error fetching facility managed clients:', facilityClientsError);
      } else {
        console.log('Facility managed clients found:', facilityClients.length);
        if (facilityClients.length > 0) {
          console.log('Sample client:', JSON.stringify(facilityClients[0], null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();