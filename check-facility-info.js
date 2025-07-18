const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Quick facility check
async function checkFacilityInfo() {
  const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🏥 Checking facility:', facilityId);
    
    const { data: facilityData, error: facilityError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', facilityId)
      .single();
    
    if (facilityError) {
      console.error('Error fetching facility:', facilityError);
    } else {
      console.log('Facility data:', JSON.stringify(facilityData, null, 2));
    }
    
    // Also check if this facility has any managed clients
    const { data: managedClients, error: managedClientsError } = await supabase
      .from('managed_clients')
      .select('*')
      .eq('facility_id', facilityId);
    
    if (managedClientsError) {
      console.log('Error fetching managed clients:', managedClientsError);
    } else {
      console.log('\nManaged clients for this facility:', managedClients.length);
      if (managedClients.length > 0) {
        console.log('First few managed clients:', JSON.stringify(managedClients.slice(0, 3), null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFacilityInfo();