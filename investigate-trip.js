const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Trip investigation script
async function investigateTrip() {
  const tripId = '3c8dc00f-f42d-4638-a1ce-430825e7d997';
  
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

  // Create admin client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔍 Investigating trip:', tripId);
    console.log('=' .repeat(50));
    
    // 1. Get the trip data
    console.log('\n1. TRIP DATA:');
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    
    if (tripError) {
      console.error('Error fetching trip:', tripError);
      return;
    }
    
    if (!tripData) {
      console.log('❌ Trip not found');
      return;
    }
    
    console.log('Trip data:', JSON.stringify(tripData, null, 2));
    
    // 2. Check table structure
    console.log('\n2. TRIPS TABLE STRUCTURE:');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'trips' });
    
    if (tableError) {
      console.log('Could not get table structure:', tableError);
      // Try alternative approach
      const { data: sampleRow } = await supabase
        .from('trips')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleRow) {
        console.log('Available columns:', Object.keys(sampleRow));
      }
    } else {
      console.log('Table columns:', tableInfo);
    }
    
    // 3. Check user profile if user_id exists
    let profileData = null;
    if (tripData.user_id) {
      console.log('\n3. USER PROFILE DATA:');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', tripData.user_id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        profileData = profile;
        console.log('Profile data:', JSON.stringify(profileData, null, 2));
      }
    }
    
    // 4. Check managed_client if managed_client_id exists
    let managedClientData = null;
    let facilityManagedClientData = null;
    if (tripData.managed_client_id) {
      console.log('\n4. MANAGED CLIENT DATA:');
      
      // Check managed_clients table
      const { data: managedClient, error: managedClientError } = await supabase
        .from('managed_clients')
        .select('*')
        .eq('id', tripData.managed_client_id)
        .single();
      
      if (managedClientError) {
        console.log('Error fetching from managed_clients:', managedClientError);
        
        // Try facility_managed_clients table
        const { data: facilityManagedClient, error: facilityManagedClientError } = await supabase
          .from('facility_managed_clients')
          .select('*')
          .eq('id', tripData.managed_client_id)
          .single();
        
        if (facilityManagedClientError) {
          console.log('Error fetching from facility_managed_clients:', facilityManagedClientError);
        } else {
          facilityManagedClientData = facilityManagedClient;
          console.log('Facility managed client data:', JSON.stringify(facilityManagedClientData, null, 2));
        }
      } else {
        managedClientData = managedClient;
        console.log('Managed client data:', JSON.stringify(managedClientData, null, 2));
      }
    }
    
    // 5. Check facility if facility_id exists
    if (tripData.facility_id) {
      console.log('\n5. FACILITY DATA:');
      const { data: facilityData, error: facilityError } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', tripData.facility_id)
        .single();
      
      if (facilityError) {
        console.error('Error fetching facility:', facilityError);
      } else {
        console.log('Facility data:', JSON.stringify(facilityData, null, 2));
      }
    }
    
    // 6. Check all client-related tables to see what exists
    console.log('\n6. CHECKING ALL CLIENT-RELATED TABLES:');
    
    // Get all table names
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%client%');
    
    if (tables) {
      console.log('Client-related tables:', tables.map(t => t.table_name));
      
      // Check each table for the managed_client_id
      for (const table of tables) {
        const tableName = table.table_name;
        if (tripData.managed_client_id) {
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', tripData.managed_client_id)
            .single();
          
          if (!tableError && tableData) {
            console.log(`\nFound data in ${tableName}:`, JSON.stringify(tableData, null, 2));
          }
        }
      }
    }
    
    // 7. Summary and recommendations
    console.log('\n7. SUMMARY & ANALYSIS:');
    console.log('=' .repeat(30));
    
    const clientFields = [
      'user_id',
      'managed_client_id', 
      'facility_id',
      'client_id',
      'customer_id'
    ];
    
    console.log('Client-related fields in trip:');
    clientFields.forEach(field => {
      if (tripData.hasOwnProperty(field)) {
        console.log(`  ${field}:`, tripData[field] || 'null');
      }
    });
    
    console.log('\nRecommendations:');
    if (!tripData.user_id && !tripData.managed_client_id && !tripData.facility_id) {
      console.log('❌ No client identifiers found - this explains "Unknown Client"');
    }
    
    if (tripData.user_id && !profileData) {
      console.log('❌ user_id exists but no profile found - orphaned reference');
    }
    
    if (tripData.managed_client_id && !managedClientData && !facilityManagedClientData) {
      console.log('❌ managed_client_id exists but no client record found - orphaned reference');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  investigateTrip().then(() => {
    console.log('\n✅ Investigation completed');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { investigateTrip };