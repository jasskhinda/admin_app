const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleTrip() {
  console.log('🧪 Testing simple trip creation with minimal fields...');
  
  // Get admin and driver for the test
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1);
  
  const { data: drivers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'driver')
    .limit(1);
  
  if (!admins?.length || !drivers?.length) {
    console.error('❌ Missing admin or driver');
    return;
  }
  
  const adminId = admins[0].id;
  const driver = drivers[0];
  
  // Try with just the absolutely essential fields
  const minimalTripData = {
    pickup_address: "123 Test Street, Columbus, OH",
    destination_address: "456 Test Avenue, Columbus, OH",
    pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    price: 50.00,
    distance: 10.5,
    created_by: adminId,
    created_by_role: "admin"
  };
  
  console.log('📋 Trying to create trip with minimal data:', minimalTripData);
  
  const { data: newTrip, error: tripError } = await supabase
    .from('trips')
    .insert(minimalTripData)
    .select()
    .single();
  
  if (tripError) {
    console.error('❌ Error creating minimal trip:', tripError);
    return;
  }
  
  console.log('✅ Created minimal trip:', newTrip.id);
  
  // Now test the RPC function
  console.log('\n🔧 Testing assign_trip_to_driver RPC function...');
  const { data: result, error: rpcError } = await supabase.rpc('assign_trip_to_driver', {
    trip_id: newTrip.id,
    driver_id: driver.id
  });
  
  if (rpcError) {
    console.error('❌ RPC Error:', rpcError);
    console.error('Error details:', {
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
      code: rpcError.code
    });
  } else {
    console.log('✅ RPC Function succeeded, result:', result);
    
    // Check the updated trip
    const { data: updatedTrip } = await supabase
      .from('trips')
      .select('status, driver_id')
      .eq('id', newTrip.id)
      .single();
    
    console.log('📊 Updated trip status:', updatedTrip?.status);
    console.log('👤 Assigned driver:', updatedTrip?.driver_id);
  }
  
  // Clean up
  await supabase.from('trips').delete().eq('id', newTrip.id);
  console.log('🧹 Test trip cleaned up');
}

testSimpleTrip().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});