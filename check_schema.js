const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking trips table schema...');
  
  // Try to get a sample trip to see the actual columns
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .limit(1);
  
  if (tripsError) {
    console.error('❌ Error fetching trips:', tripsError);
  } else {
    if (trips && trips.length > 0) {
      console.log('📋 Trips table columns:', Object.keys(trips[0]));
      console.log('📋 Sample trip data:', trips[0]);
    } else {
      console.log('📋 No trips found, checking with empty select...');
      
      // Try a different approach to get schema info
      const { data: emptyResult, error: emptyError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000'); // This will return empty but show schema
      
      if (emptyError) {
        console.error('❌ Error with empty query:', emptyError);
      } else {
        console.log('📋 Empty result (but query worked):', emptyResult);
      }
    }
  }
  
  // Also check if we can find any trips at all with specific columns that we know exist
  console.log('\n🔍 Checking for any existing trips with basic columns...');
  const { data: basicTrips, error: basicError } = await supabase
    .from('trips')
    .select('id, status, driver_id, created_at')
    .limit(5);
  
  if (basicError) {
    console.error('❌ Error fetching basic trips:', basicError);
  } else {
    console.log('📋 Found trips:', basicTrips?.length || 0);
    if (basicTrips && basicTrips.length > 0) {
      basicTrips.forEach(trip => {
        console.log(`  ${trip.id} | Status: ${trip.status} | Driver: ${trip.driver_id || 'None'} | Created: ${trip.created_at}`);
      });
    }
  }
}

checkSchema().then(() => {
  console.log('\n🏁 Schema check completed');
  process.exit(0);
}).catch(console.error);