const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDriverAssignmentWorkflow() {
  console.log('🧪 Testing driver assignment workflow...');
  
  // Get a driver
  const { data: drivers, error: driversError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'driver')
    .limit(1);
  
  if (driversError || !drivers?.length) {
    console.error('❌ No drivers found:', driversError);
    return;
  }
  
  const testDriver = drivers[0];
  console.log(`👤 Found driver: ${testDriver.first_name} ${testDriver.last_name} (${testDriver.id})`);
  
  // Get an admin user for created_by
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'admin')
    .limit(1);
  
  if (adminsError || !admins?.length) {
    console.error('❌ No admin users found:', adminsError);
    return;
  }
  
  const testAdmin = admins[0];
  console.log(`👨‍💼 Found admin: ${testAdmin.first_name} ${testAdmin.last_name} (${testAdmin.id})`);
  
  // Get a client (try individual clients first)
  const { data: clients, error: clientsError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'client')
    .limit(1);
  
  let clientId = null;
  if (clients && clients.length > 0) {
    clientId = clients[0].id;
    console.log(`👤 Found client: ${clients[0].first_name} ${clients[0].last_name} (${clientId})`);
  } else {
    console.log('⚠️ No individual clients found, will create trip without client');
  }
  
  // Create a test trip using correct column names
  const tripData = {
    pickup_address: "123 Test Street, Columbus, OH 43215",
    destination_address: "456 Test Avenue, Columbus, OH 43215", 
    pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: "pending",
    price: 50.00,
    distance: 10.5,
    duration: 25,
    created_by: testAdmin.id,
    created_by_role: "admin",
    is_round_trip: false,
    additional_passengers: 0,
    is_emergency: false
  };
  
  // Add client if we found one
  if (clientId) {
    tripData.user_id = clientId;
  }
  
  console.log('\n📋 Creating test trip with data:', tripData);
  
  const { data: newTrip, error: tripError } = await supabase
    .from('trips')
    .insert(tripData)
    .select()
    .single();
  
  if (tripError) {
    console.error('❌ Error creating test trip:', tripError);
    return;
  }
  
  console.log(`✅ Created test trip: ${newTrip.id}`);
  console.log(`📊 Trip status: ${newTrip.status}`);
  
  // Now test the RPC function
  console.log('\n🔧 Testing assign_trip_to_driver RPC function...');
  try {
    const { data: result, error: rpcError } = await supabase.rpc('assign_trip_to_driver', {
      trip_id: newTrip.id,
      driver_id: testDriver.id
    });
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      console.error('Full error details:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });
    } else {
      console.log('✅ RPC Function succeeded, result:', result);
      
      // Check the updated trip
      const { data: updatedTrip, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', newTrip.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching updated trip:', fetchError);
      } else {
        console.log('📊 Updated trip status:', updatedTrip.status);
        console.log('👤 Assigned driver:', updatedTrip.driver_id);
        
        if (updatedTrip.status === 'awaiting_driver_acceptance' && updatedTrip.driver_id === testDriver.id) {
          console.log('🎉 RPC function is working correctly!');
        } else {
          console.log('⚠️ RPC function did not update trip as expected');
        }
      }
    }
  } catch (error) {
    console.error('❌ Unexpected RPC error:', error);
  }
  
  // Now test the actual API endpoint using fetch
  console.log('\n🌐 Testing /api/admin/assign-driver endpoint...');
  
  // First, reset the trip to test the API
  await supabase
    .from('trips')
    .update({ status: 'pending', driver_id: null })
    .eq('id', newTrip.id);
  
  console.log('🔄 Reset trip to pending status for API test');
  
  try {
    const apiResponse = await fetch('http://localhost:3001/api/admin/assign-driver', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: newTrip.id,
        driverId: testDriver.id
      })
    });
    
    const responseText = await apiResponse.text();
    console.log('🔍 API Response status:', apiResponse.status);
    console.log('🔍 API Response body:', responseText);
    
    if (apiResponse.status === 401) {
      console.log('📝 API failed due to authentication (expected - no session cookie)');
    } else if (apiResponse.ok) {
      console.log('✅ API request succeeded');
      try {
        const responseData = JSON.parse(responseText);
        console.log('📊 Parsed response:', responseData);
      } catch (parseError) {
        console.log('⚠️ Could not parse response as JSON');
      }
    } else {
      console.error('❌ API request failed');
      console.error('Response headers:', Object.fromEntries(apiResponse.headers.entries()));
    }
  } catch (fetchError) {
    console.error('❌ API request error:', fetchError.message);
  }
  
  // Clean up test trip
  console.log('\n🧹 Cleaning up test trip...');
  const { error: deleteError } = await supabase.from('trips').delete().eq('id', newTrip.id);
  if (deleteError) {
    console.error('❌ Error deleting test trip:', deleteError);
  } else {
    console.log('✅ Test trip deleted');
  }
}

testDriverAssignmentWorkflow().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});