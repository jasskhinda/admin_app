const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

// Use service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExistingTrips() {
  console.log('🔍 Checking for existing trips (using service role)...');
  
  try {
    // Get all trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }
    
    console.log(`📋 Found ${trips?.length || 0} trips`);
    
    if (trips && trips.length > 0) {
      console.log('\n📊 Trip details:');
      trips.forEach((trip, index) => {
        console.log(`\n${index + 1}. Trip ID: ${trip.id}`);
        console.log(`   Status: ${trip.status}`);
        console.log(`   Driver ID: ${trip.driver_id || 'None'}`);
        console.log(`   Pickup: ${trip.pickup_address}`);
        console.log(`   Destination: ${trip.destination_address}`);
        console.log(`   Pickup Time: ${trip.pickup_time}`);
        console.log(`   Created: ${trip.created_at}`);
      });
      
      // Find a trip we can test assignment with
      const testableTrip = trips.find(trip => 
        (trip.status === 'pending' || trip.status === 'upcoming') && 
        !trip.driver_id
      );
      
      if (testableTrip) {
        console.log(`\n🎯 Found testable trip: ${testableTrip.id}`);
        console.log(`   Status: ${testableTrip.status}`);
        console.log(`   No driver assigned - perfect for testing!`);
        
        // Now let's test the RPC function with service role
        const { data: drivers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('role', 'driver')
          .limit(1);
        
        if (drivers && drivers.length > 0) {
          const testDriver = drivers[0];
          console.log(`\n🧪 Testing RPC function with service role...`);
          console.log(`   Trip: ${testableTrip.id}`);
          console.log(`   Driver: ${testDriver.first_name} ${testDriver.last_name} (${testDriver.id})`);
          
          const { data: result, error: rpcError } = await supabase.rpc('assign_trip_to_driver', {
            trip_id: testableTrip.id,
            driver_id: testDriver.id
          });
          
          if (rpcError) {
            console.error('❌ RPC Error (with service role):', rpcError);
            console.error('Full error details:', {
              message: rpcError.message,
              details: rpcError.details,
              hint: rpcError.hint,
              code: rpcError.code
            });
          } else {
            console.log('✅ RPC Function succeeded with service role, result:', result);
            
            // Check the updated trip
            const { data: updatedTrip } = await supabase
              .from('trips')
              .select('status, driver_id')
              .eq('id', testableTrip.id)
              .single();
            
            console.log('📊 Updated trip status:', updatedTrip?.status);
            console.log('👤 Assigned driver:', updatedTrip?.driver_id);
            
            if (updatedTrip?.status === 'awaiting_driver_acceptance' && updatedTrip?.driver_id === testDriver.id) {
              console.log('🎉 RPC function works perfectly with service role!');
              console.log('The 500 error in the API must be due to authentication or permissions.');
            }
          }
        }
      } else {
        console.log('\n⚠️ No testable trips found (need pending/upcoming trips without drivers)');
        
        // Create a test trip with service role
        console.log('\n🔧 Creating a test trip with service role...');
        
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        
        if (admins && admins.length > 0) {
          const testTripData = {
            pickup_address: "123 Test Street, Columbus, OH",
            destination_address: "456 Test Avenue, Columbus, OH",
            pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: "pending",
            price: 50.00,
            distance: 10.5,
            created_by: admins[0].id,
            created_by_role: "admin"
          };
          
          const { data: newTrip, error: createError } = await supabase
            .from('trips')
            .insert(testTripData)
            .select()
            .single();
          
          if (createError) {
            console.error('❌ Error creating test trip with service role:', createError);
          } else {
            console.log('✅ Created test trip with service role:', newTrip.id);
            console.log('Now you can test driver assignment in the admin UI!');
          }
        }
      }
    } else {
      console.log('📋 No trips found in the database');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkExistingTrips().then(() => {
  console.log('\n🏁 Check completed');
  process.exit(0);
}).catch(console.error);