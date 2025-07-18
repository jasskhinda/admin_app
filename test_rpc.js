const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCFunction() {
  console.log('🔍 Testing assign_trip_to_driver RPC function...');
  
  // First, let's get a sample trip and driver to test with
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, status, driver_id')
    .in('status', ['pending', 'upcoming'])
    .limit(1);
  
  if (tripsError) {
    console.error('❌ Error fetching trips:', tripsError);
    return;
  }
  
  const { data: drivers, error: driversError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'driver')
    .limit(1);
  
  if (driversError) {
    console.error('❌ Error fetching drivers:', driversError);
    return;
  }
  
  if (!trips?.length) {
    console.log('⚠️ No pending/upcoming trips found for testing');
    return;
  }
  
  if (!drivers?.length) {
    console.log('⚠️ No drivers found for testing');
    return;
  }
  
  const testTrip = trips[0];
  const testDriver = drivers[0];
  
  console.log(`📋 Testing with trip: ${testTrip.id} (status: ${testTrip.status})`);
  console.log(`👤 Testing with driver: ${testDriver.first_name} ${testDriver.last_name} (${testDriver.id})`);
  
  // Test the RPC function
  try {
    const { data: result, error: rpcError } = await supabase.rpc('assign_trip_to_driver', {
      trip_id: testTrip.id,
      driver_id: testDriver.id
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
      console.log('✅ RPC Function succeeded');
      console.log('Result:', result);
      
      // Check the trip status after assignment
      const { data: updatedTrip, error: fetchError } = await supabase
        .from('trips')
        .select('status, driver_id')
        .eq('id', testTrip.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching updated trip:', fetchError);
      } else {
        console.log('📊 Updated trip status:', updatedTrip.status);
        console.log('👤 Assigned driver:', updatedTrip.driver_id);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRPCFunction().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(console.error);