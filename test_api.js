const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestTripAndTestAPI() {
  console.log('🧪 Creating test trip and testing API...');
  
  // First get a driver ID
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
  console.log(`👤 Found driver: ${testDriver.first_name} ${testDriver.last_name}`);
  
  // Create a test trip
  const { data: newTrip, error: tripError } = await supabase
    .from('trips')
    .insert({
      pickup_address: 'Test Pickup Address',
      dropoff_address: 'Test Dropoff Address',
      pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      status: 'pending',
      trip_distance: 10.5,
      trip_duration: 20,
      total_cost: 25.00,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (tripError) {
    console.error('❌ Error creating test trip:', tripError);
    return;
  }
  
  console.log(`📋 Created test trip: ${newTrip.id}`);
  
  // Now test the RPC function directly
  console.log('\n🔧 Testing RPC function directly...');
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
      }
    }
  } catch (error) {
    console.error('❌ Unexpected RPC error:', error);
  }
  
  // Now test the actual API endpoint
  console.log('\n🌐 Testing API endpoint...');
  try {
    const response = await fetch('http://localhost:3001/api/admin/assign-driver', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: newTrip.id,
        driverId: testDriver.id
      })
    });
    
    const responseText = await response.text();
    console.log('🔍 API Response status:', response.status);
    console.log('🔍 API Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('🔍 API Response body:', responseText);
    
    if (!response.ok) {
      console.error('❌ API request failed');
    } else {
      console.log('✅ API request succeeded');
    }
  } catch (error) {
    console.error('❌ API request error:', error);
  }
  
  // Clean up test trip
  console.log('\n🧹 Cleaning up test trip...');
  await supabase.from('trips').delete().eq('id', newTrip.id);
  console.log('✅ Test trip deleted');
}

createTestTripAndTestAPI().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(console.error);