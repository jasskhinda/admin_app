const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTripsAndDrivers() {
  console.log('🔍 Checking trips and drivers...');
  
  // Get all trips with their statuses
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, status, driver_id, managed_client_id')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (tripsError) {
    console.error('❌ Error fetching trips:', tripsError);
  } else {
    console.log('\n📋 Recent trips:');
    trips.forEach(trip => {
      console.log(`  ${trip.id.substring(0, 8)}... | Status: ${trip.status} | Driver: ${trip.driver_id ? trip.driver_id.substring(0, 8) + '...' : 'None'}`);
    });
  }
  
  // Get all drivers
  const { data: drivers, error: driversError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('role', 'driver');
  
  if (driversError) {
    console.error('❌ Error fetching drivers:', driversError);
  } else {
    console.log('\n👥 Available drivers:');
    drivers.forEach(driver => {
      console.log(`  ${driver.id.substring(0, 8)}... | ${driver.first_name} ${driver.last_name}`);
    });
  }

  // Test if RPC function exists by trying to call it with invalid parameters
  console.log('\n🧪 Testing if RPC function exists...');
  try {
    const { data, error } = await supabase.rpc('assign_trip_to_driver', {
      trip_id: '00000000-0000-0000-0000-000000000000',
      driver_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      if (error.message.includes('function assign_trip_to_driver') && error.message.includes('does not exist')) {
        console.log('❌ Function does not exist in database');
      } else {
        console.log('✅ Function exists (got expected error for invalid IDs)');
        console.log('Error details:', error.message);
      }
    } else {
      console.log('✅ Function exists and returned:', data);
    }
  } catch (error) {
    console.error('❌ Unexpected error testing function:', error);
  }
}

checkTripsAndDrivers().then(() => {
  console.log('\n🏁 Check completed');
  process.exit(0);
}).catch(console.error);